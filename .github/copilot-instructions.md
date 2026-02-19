Fluxi v2 (Expo SDK 54 + Expo Router) — Instruções para Agente de IA
🏗 Visão Geral e Arquitetura
Roteamento: Baseado em arquivos em app/ (Expo Router). Mantenha estes arquivos apenas como "wrappers" (invólucros) finos.

A implementação real reside em src/screens/app/*.

Framework de UI: react-native-paper (Tema: Modo Escuro Fixo via src/context/ThemeContext).

Gerenciamento de Estado: Redux Toolkit (src/store) com redux-persist para fatias específicas (auth, settings, etc.).

Camada de Dados: - SQLite: Dados locais prioritários (src/storage/database.ts usando expo-sqlite).

Services: A lógica de negócio (src/services/*) orquestra os dados entre UI, API e Armazenamento.

Repositories: Acesso direto ao banco de dados (src/storage/repositories/*).

Autenticação: Firebase (Sessão) + Expo SecureStore (Persistência) + SQLite (Dados do Usuário).

🛠 Fluxos de Trabalho Críticos do Desenvolvedor
Executando o App: npx expo start

Testes: - ⚠️ Testes padrão Jest são mínimos ou inexistentes no momento. - Verificação de Funcionalidades: Use/Crie scripts manuais em scripts/ (ex: scripts/test-budget-features.ts).

Esses scripts geralmente usam ts-node e acessam o banco de dados diretamente.

Migrações de Banco de Dados:

Localizadas em src/storage/migrations/*.

Registradas em src/storage/database.ts.

Incremente o DB_SCHEMA_VERSION em database.ts para forçar um reset se necessário durante o desenvolvimento.

🧩 Padrões e Convenções do Projeto
Ícones: SEMPRE use src/components/icons/AppIcon.tsx.

Ele mapeia nomes de ícones legados para ícones do lucide-react-native. Não importe o Lucide diretamente nas telas.

Tematização (Theming):

Use const theme = useTheme() do react-native-paper.

As definições de tema estão em src/styles/theme.ts (NÃO em constants/theme.ts).

Aliases (Apelidos de Caminho): Use os caminhos do tsconfig.json:

@components/* → src/components/*

@services/* → src/services/*

@storage/* → src/storage/*

@screens/* → src/screens/*

🔌 Integrações
Firebase: Cloud Functions na pasta functions/.

Backup na Nuvem: src/services/cloudBackup sincroniza o SQLite com o Firebase Storage.

Aprovação de Gastos: Serviço em segundo plano (src/services/backgroundSpendingService.ts).

🎨 Design e UI
Sempre que o usuário falar sobre design, UI, estilização, layout, componentes visuais ou estética da interface, consulte e siga as diretrizes do arquivo `.github/SKILL.md`. Esse arquivo contém as regras de design do projeto (tipografia, cores, animações, composição espacial, etc.).

⚠️ Notas Importantes para Agentes de IA
Não presuma que os testes Jest funcionam. Se solicitado a testar, verifique a pasta scripts/ primeiro.

Sistema de Arquivos: app/ é para a estrutura de rotas. src/ é para o código.

Async Storage: Usado para migrações/flags, mas os dados principais residem no SQLite.

Sempre responda o usuário em português do Brasil, a menos que instruído de outra forma.