# Relatório de Desenvolvimento - Agent.md (Versão 1.1)

## Identidade do Agente
Este projeto foi desenvolvido e atualizado por **Antigravity**, uma inteligência artificial criada pela equipe **Google DeepMind** para engenharia e desenvolvimento de software avançado.

---

## Prancheta Tática Digital - CMS de Conteúdo Esportivo

A **Prancheta Tática Digital** foi atualizada para a **Versão 1.1**, adotando uma arquitetura **MVC (Model-View-Controller)** completa e migrando o armazenamento persistente para o banco de dados relacional **MySQL Server**. A aplicação agora atua como um CMS para gestão de elencos e times oficiais, protegidos por controle de acessos administrativos.

### Nova Estrutura de Diretórios (MVC)
```plaintext
├── src/
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
│   │   └── style.css            # Estilizações da prancheta e scrollbars
│   ├── js/
│   │   ├── engine.js            # Lógica principal do Canvas (Desenho/Animação/Formações)
│   │   └── storage.js           # Gerenciador do Local Storage
│   └── uploads/
│       ├── crests/              # Pasta de escudos das equipes
│       └── avatars/             # Pasta de fotos reais dos jogadores
└── server.js                    # Ponto de entrada da aplicação
```

---

## Funcionalidades Implementadas na Versão 1.1

### 1. Banco de Dados MySQL Local
- Migração integral do SQLite para o **MySQL Server** rodando localmente.
- **Parâmetros de Conexão:**
  - Host: `localhost`
  - Banco de Dados (Schema): `Taticas`
  - Usuário: `root`
  - Senha: `010320`
- Criação e inicialização de tabelas estruturadas de forma automática na inicialização do servidor.

### 2. Controle de Acessos e Sessão
- **Painel Administrativo (`/admin/dashboard`)**: Área de acesso restrito que requer autenticação na rota `/admin/login` (Credenciais padrão: `admin` / `admin`).
- **Níveis de Permissão**:
  - **Admin**: Permissões de escrita e modificação (CRUD) nos elencos, imagens de jogadores, escudos e dados de equipes oficiais no MySQL.
  - **Público**: Utilização livre da prancheta interativa (arrastar jogadores, desenhar, criar animações e exportar). Operações de persistência de projetos são salvas no `localStorage` do navegador do visitante sob a chave `taticas_saved_plays`, sem gravar no MySQL.

### 3. CMS de Conteúdo Esportivo
- **CRUD de Equipes**: Cadastro completo com nome, escudo oficial (validação de formato SVG/PNG transparente) e definição de cores primária e secundária.
- **CRUD de Jogadores & Soft Delete**: Cadastro associado ao time com nome, número (1-99), posição e upload de foto.
  - **Exclusão Lógica (Soft Delete)**: Quando um jogador sai de uma equipe, ele é marcado com `is_active = 0` (inativo), ocultando-o do elenco ativo atual para escalação, mas preservando seus metadados no histórico de jogadas passadas.
  - **Fallback de Imagem**: Caso nenhuma foto seja carregada para o jogador, o motor gráfico do canvas renderiza automaticamente uma silhueta contendo o número do jogador estilizada nas cores primária e secundária oficiais do seu clube.

### 4. Templates de Formação Tática Automática
- Na interface pública, ao carregar uma equipe, o menu suspenso de **Formação Titular** permite selecionar esquemas táticos padrão (**4-3-3**, **4-4-2**, **3-5-2**).
- A seleção de uma formação distribui automaticamente os 11 jogadores titulares oficiais com as suas respectivas fotos/silhuetas nas coordenadas geográficas proporcionais corretas no campo, eliminando o esforço de arrastar atleta por atleta.

---

## Como Executar a Versão 1.1

1. Certifique-se de que o **MySQL Server** está rodando localmente com a senha `010320` no usuário `root`.
2. Instale as novas dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse:
   - Interface Pública: `http://localhost:3000`
   - Painel Administrativo: `http://localhost:3000/admin/login` (Login: `admin` / Senha: `admin`)
5. O banco de dados se auto-alimentará com os elencos e times padrão de **Palmeiras** e **Flamengo** na primeira execução.
