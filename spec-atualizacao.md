Documento de Especificação Técnica (Tech Spec) - Versão 1.11. Visão GeralEste documento detalha as especificações de engenharia de software para a implementação da Versão 1.1 da Prancheta Tática Digital, baseada nas regras de negócio e arquiteturais definidas no PRD de atualização.  2. Arquitetura MVC (Model-View-Controller)A aplicação adotará o padrão MVC no backend (recomendado Node.js com Express) para separação clara de responsabilidades.  2.1. Estrutura de DiretóriosEstrutura recomendada para a organização do projeto:  Plaintext├── src/
│   ├── config/
│   │   └── database.js          # Conexão Pool com o MySQL
│   ├── controllers/
│   │   ├── adminController.js   # Lógica de login e CRUD (Times, Jogadores)
│   │   └── publicController.js  # Lógica de carregamento da interface pública
│   ├── middlewares/
│   │   ├── authMiddleware.js    # Proteção de rotas do painel Admin
│   │   └── uploadMiddleware.js  # Configuração do Multer (Upload de mídias)
│   ├── models/
│   │   ├── Team.js              # Queries e abstração da tabela Teams
│   │   └── Player.js            # Queries e abstração da tabela Players
│   ├── views/
│   │   ├── admin/
│   │   │   ├── login.html       # View de autenticação
│   │   │   └── dashboard.html   # View do CMS
│   │   └── public/
│   │       └── board.html       # View do Canvas 2D (Prancheta)
├── public/
│   ├── css/
│   │   └── tailwind.css         # Estilos Tailwind compilados
│   ├── js/
│   │   ├── engine.js            # Lógica principal do Canvas (Desenho/Animação)
│   │   └── storage.js           # Gerenciador do Local Storage
│   └── uploads/
│       ├── crests/              # Pasta de escudos das equipes
│       └── avatars/             # Pasta de fotos reais dos jogadores
└── server.js                    # Ponto de entrada da aplicação
3. Banco de Dados MySQL (DDL e Conexão)3.1. Configuração de ConexãoHost: localhost  Usuário: root  Senha: 010320  Database: Taticas  3.2. Script de Criação (Schema)Abaixo está o script SQL exato para a criação das tabelas na base de dados:  SQLCREATE DATABASE IF NOT EXISTS Taticas;
USE Taticas;

-- Tabela de Equipas
CREATE TABLE IF NOT EXISTS Teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    primary_color VARCHAR(7) NOT NULL,    -- Ex: '#006437'
    secondary_color VARCHAR(7) NOT NULL,  -- Ex: '#FFFFFF'
    crest_url VARCHAR(255) NOT NULL,      -- Caminho relativo ex: '/uploads/crests/palmeiras.png'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Jogadores (com Soft Delete)
CREATE TABLE IF NOT EXISTS Players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    number INT NOT NULL,
    position VARCHAR(10) NOT NULL,
    photo_url VARCHAR(255) NULL,          -- Caminho da foto. Se NULL, renderiza fallback.
    is_active TINYINT(1) DEFAULT 1,       -- 1=Ativo, 0=Inativo (Soft Delete)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE RESTRICT
);
4. Gestão de Arquivos (Uploads)O servidor não guardará imagens como binários (BLOB) no MySQL. Utilizará armazenamento no sistema de ficheiros.  Biblioteca: multer (para Node.js).  Validação de MIME Type:Escudos (/crests/): Apenas image/png e image/svg+xml.  Avatares (/avatars/): Apenas image/jpeg, image/png, image/webp.  Renomeação: Para evitar colisões, os ficheiros devem ser renomeados no servidor combinando um timestamp único com o nome original limpo (ex: 167890123-jogador.png).  5. Middleware de Autenticação (Segurança)Todas as rotas sob o prefixo /admin/* (exceto /admin/login) e operações de escrita na API devem exigir validação de sessão.  Exemplo de implementação do middleware:  JavaScript// Exemplo de authMiddleware.js
function requireAdmin(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    // Retorna erro 401 para chamadas fetch/AJAX ou redireciona para view normal
    if(req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    res.redirect('/admin/login');
}
6. Lógica de Renderização Frontend (Motor do Canvas)6.1. Imagem de Fallback (Silhueta)A função de desenho de cada "token" de jogador no requestAnimationFrame deve verificar a existência de photo_url.  JavaScriptfunction drawPlayer(ctx, player) {
    ctx.save();
    
    // Circunferência base para a borda
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.team.secondaryColor; 
    ctx.fill();

    if (player.photoUrl && imageLoaded(player.photoUrl)) {
        // Recorta a imagem em formato circular (Clipping Mask)
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(getImageObject(player.photoUrl), player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
    } else {
        // Fallback: Silhueta com cor primária e número
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius - 2, 0, Math.PI * 2);
        ctx.fillStyle = player.team.primaryColor;
        ctx.fill();
        
        ctx.fillStyle = player.team.secondaryColor;
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(player.number, player.x, player.y);
    }
    
    ctx.restore();
}
6.2. Templates de Formação TáticaO frontend deve carregar dicionários de posições relativas (em percentagem da dimensão do canvas) para preencher a prancheta automaticamente:  JavaScriptconst formations = {
    "4-3-3": [
        { role: 'GK', x: 0.1, y: 0.5 },
        { role: 'RB', x: 0.3, y: 0.15 },
        { role: 'CB1', x: 0.25, y: 0.35 },
        { role: 'CB2', x: 0.25, y: 0.65 },
        { role: 'LB', x: 0.3, y: 0.85 },
        { role: 'CDM', x: 0.45, y: 0.5 },
        { role: 'CM1', x: 0.55, y: 0.3 },
        { role: 'CM2', x: 0.55, y: 0.7 },
        { role: 'RW', x: 0.75, y: 0.2 },
        { role: 'ST', x: 0.85, y: 0.5 },
        { role: 'LW', x: 0.75, y: 0.8 }
    ]
};
7. Persistência Local (Local Storage Público)Para visitantes sem acesso à base de dados, o sistema utilizará o localStorage do HTML5.  Chave de armazenamento: taticas_saved_plays  Estrutura de Dados:JSON{
  "play_123456789": {
    "title": "Saída Lavolpiana",
    "team_id": 1,
    "background": "FULL_FIELD",
    "frames": [
      {
        "frame_index": 0,
        "tokens": [...],
        "lines": [...]
      }
    ],
    "last_modified": "2026-06-16T22:21:00Z"
  }
}
  As funções de auto-save serializam o estado atual do Canvas via JSON.stringify() e injetam nesta estrutura.  