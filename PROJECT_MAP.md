# Структура Проєкту AI Dungeon Master

```text
/ (root)
├── index.html                  # Точка входу HTML (Babel Standalone, Import Map)
├── index.tsx                   # Точка входу React (Root Render)
├── package.json                # Залежності
├── vite.config.ts              # Конфігурація Vite (для збірки)
├── types.ts                    # Глобальні TypeScript типи
├── firebaseConfig.ts           # Налаштування Firebase
└── src/                        # Вихідний код
    ├── App.tsx                 # Головний компонент та Роутінг
    ├── index.css               # Глобальні стилі (Tailwind)
    ├── components/             # UI Компоненти
    │   ├── AdventureLog.tsx    # Лог історії та експорт HTML
    │   ├── BattleMap.tsx       # Канвас тактичної мапи
    │   ├── CharacterSheet.tsx  # Лист персонажа
    │   ├── CloudSaves.tsx      # Збереження (Google Drive / Local)
    │   ├── CombatActionsPanel.tsx # Панель дій (Атака, Магія)
    │   ├── CombatTracker.tsx   # Трекер ініціативи
    │   ├── Compendium.tsx      # Довідник правил (SRD API)
    │   ├── DiceRoller.tsx      # 3D кубики
    │   ├── DMTools.tsx         # Інструменти Майстра (AI генератори)
    │   ├── GameArea.tsx        # Головний ігровий екран
    │   ├── GameSetup.tsx       # Екран налаштування/входу
    │   ├── HomebrewManager.tsx # Створення кастомних заклять/монстрів
    │   ├── Journal.tsx         # Квести та нотатки
    │   ├── Layout.tsx          # Загальна структура сторінки
    │   ├── LobbyPanel.tsx      # Лобі мультиплеєра
    │   ├── LootModal.tsx       # Модальне вікно луту
    │   ├── MerchantShop.tsx    # Магазин
    │   ├── ModManager.tsx      # Менеджер модів
    │   ├── MultiplayerConnection.tsx # Статус з'єднання
    │   ├── MultiplayerMenu.tsx # Меню сесій (Firebase)
    │   ├── QuestLog.tsx        # Віджет квестів
    │   ├── Typewriter.tsx      # Ефект друку тексту
    │   ├── VideoChat.tsx       # Відеозв'язок
    │   └── VisualFX.tsx        # Система частинок (Canvas)
    ├── contexts/               # React Contexts
    │   └── ThemeContext.tsx    # Теми оформлення
    ├── data/                   # Статичні дані
    │   └── spells.ts           # База заклять
    ├── hooks/                  # Кастомні хуки
    │   └── useGameController.ts # Логіка оновлення стану гри
    ├── services/               # Сервіси (API та логіка)
    │   ├── crdtService.ts      # Синхронізація даних (Yjs)
    │   ├── dndApiService.ts    # D&D 5e API
    │   ├── firebaseService.ts  # Firebase (опціонально)
    │   ├── geminiService.ts    # Google AI (Gemini)
    │   ├── googleDriveService.ts # Google Drive API
    │   ├── peerService.ts      # WebRTC (PeerJS)
    │   └── ragService.ts       # Векторний пошук (RAG)
    ├── store/                  # Глобальний стейт (Zustand)
    │   ├── index.ts            # Головний стор
    │   ├── types.ts            # Типи слайсів
    │   └── slices/             # Частини стору
    │       ├── characterSlice.ts
    │       ├── chatSlice.ts
    │       ├── combatSlice.ts
    │       ├── gameSlice.ts
    │       ├── mapSlice.ts
    │       ├── modSlice.ts
    │       └── uiSlice.ts
    └── utils/                  # Утиліти
        ├── audioSynth.ts       # Синтез звуків (Web Audio API)
        ├── geometry.ts         # Геометрія (Raycasting, Fog of War)
        ├── mechanics.ts        # Правила D&D (AC, Modifiers)
        └── particleSystem.ts   # Система частинок
```