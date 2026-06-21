# Documento de Requisitos do Produto (PRD Complementar) - Versão 1.1

## 1. Visão Geral da Atualização
Este documento estabelece as especificações de produto para a atualização (Versão 1.1) da **Prancheta Tática Digital**. O foco principal desta iteração é transformar um simulador tático estático e local numa plataforma robusta de Gestão de Conteúdo (CMS) baseada no padrão **MVC (Model-View-Controller)**, com migração para um banco de dados relacional robusto (**MySQL**) e isolamento estrito de permissões através de um painel de administração protegido.

---

## 2. Nova Stack Tecnológica e Arquitetura

### 2.1. Arquitetura MVC (Model-View-Controller)
* **Model:** Camada responsável pela abstração dos dados, validações estruturais e comunicação direta através de queries ou ORM com o banco de dados MySQL.
* **View:** Páginas de apresentação construídas em HTML5 e Tailwind CSS, renderizadas pelo servidor ou atualizadas dinamicamente via API.
* **Controller:** Camada intermediária encarregada de processar as requisições do utilizador, gerir sessões, aplicar middlewares de segurança e acionar os Models necessários.

### 2.2. Migração para MySQL Local
* Substituição integral do motor SQLite pelo **MySQL Server** executado localmente.
* **Parâmetros de Conexão Mandatórios:**
    * **Nome do Banco de Dados (Schema):** `Taticas`
    * **Senha do Usuário Root:** `010320`

---

## 3. Controle de Acessos e Níveis de Permissão

### 3.1. Painel Administrativo (Privado e Autenticado)
* **Autenticação:** Rota exclusiva `/admin/login` para acesso restrito.
* **Capacidades do Administrador:** Apenas utilizadores autenticados nesta área têm permissões de escrita e modificação (operações mutativas de CRUD) nos elencos, imagens de jogadores, escudos e dados das equipas oficiais no MySQL.

### 3.2. Área Pública (Visitantes)
* **Funcionalidade Sem Restrição de Uso:** O utilizador comum tem acesso a todas as ferramentas interativas da prancheta (arrastar jogadores, simular a bola, desenhar setas táticas, criar quadros-chave e exportar vídeos/imagens).
* **Restrição de Banco de Dados:** O utilizador público **não** pode alterar os dados oficiais do sistema nem submeter dados diretamente ao MySQL.
* **Mecanismo de Persistência em Local Storage:** Caso o utilizador comum decida salvar uma jogada criada por ele, o sistema armazenará estes dados integralmente no `localStorage` do navegador do visitante. O ciclo de vida destes dados deve garantir que, mesmo após fechar e reabrir o navegador, as jogadas continuem salvas no painel público do utilizador.

---

## 4. Requisitos Funcionais (CMS de Conteúdo Esportivo)

### 4.1. CRUD de Equipas
* **Identificação:** Nome oficial da equipa totalmente editável pelo Admin.
* **Escudos Oficiais:** Campo para upload do brasão/escudo da equipa. O sistema deve validar o formato exigindo ficheiros com transparência nativa (preferencialmente **SVG** ou **PNG transparente**) para preservar a estética profissional sobre o canvas.
* **Paleta de Cores Oficial:** Definição exata das cores primárias e secundárias em formato hexadecimal (Ex: Palmeiras - Verde `#006437` e Branco `#FFFFFF`; Flamengo - Vermelho `#C4122E` e Preto `#000000`). Estas cores devem controlar a estilização dinâmica dos avatares e barras de interface.

### 4.2. CRUD de Jogadores e Gestão de Janelas de Transferências
* **Avatares com Imagens Reais:** Substituição de círculos coloridos estáticos por fotos/imagens reais ou recriadas dos futebolistas oficiais de cada clube.
* **Atualização de Elenco:** O Admin terá um ecrã dedicado para atualizar dados e imagens de jogadores sempre que as janelas de transferências de mercado fecharem ou abrirem.
* **Regra de Negócio: Imagem de Fallback (Silhueta Autónoma):** Caso o administrador registe um novo jogador no elenco e não realize o upload da foto em tempo hábil, o motor gráfico do canvas não deve quebrar nem exibir imagens corrompidas. O sistema renderizará automaticamente uma silhueta genérica estilizada em tempo real com as cores oficiais (primária e secundária) do clube configurado.
* **Regra de Negócio: Exclusão Lógica (Soft Delete):** É proibido apagar permanentemente (Hard Delete) um jogador do banco de dados quando ele sai do clube, pois isso corromperia e quebraria o histórico de jogadas táticas antigas salvas que fazem referência ao ID dele. O sistema implementará um campo lógico (Ex: `is_active = false` ou arquivamento), ocultando o atleta do elenco ativo atual, mas preservando os seus metadados nos frames históricos.

### 4.3. Carregamento por Templates de Formação Tática
* Como otimização de usabilidade no painel público, ao selecionar uma equipa (ex: Palmeiras), o sistema deve disponibilizar um menu suspenso com esquemas táticos padrão (Ex: 4-3-3, 4-4-2, 3-5-2).
* Ao selecionar um esquema, os 11 jogadores titulares oficiais com as suas respetivas fotos reais devem ser distribuídos de forma automática nas suas posições geográficas ideais dentro do canvas, poupando o utilizador do esforço de arrastar atleta por atleta individualmente da barra lateral.
