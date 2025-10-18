# 🚀 Plunderverse

> A Firefly-inspired 3D space outlaw game set in a bankrupt solar system

**Plunderverse** is an immersive space adventure where you play as a smuggler navigating the dangerous cosmos of 2149. Trade, fight, and survive in a procedurally generated solar system driven by dynamic economics and branching narratives.

## ✨ Features

### Core Gameplay Loops

🛸 **Trade & Survive**
- Mine resources from asteroids and planetary surfaces
- Dynamic inter-station trading with fluctuating market prices
- Manage vital resources: fuel, hull integrity, oxygen, and crew wages
- Equipment degradation and faction reputation system

⚔️ **Combat & Notoriety**
- Turn-based combat against various enemy types
- "Heat" system: illegal activities increase your notoriety
- Aggressive patrol responses and shoot-on-sight orders at high heat levels
- Strategic combat decisions affect your reputation

📜 **Mission & Story**
- Reputation-gated missions: delivery, combat, and exploration
- Multi-act branching story with meaningful choices
- Five distinct endings based on your karma and faction relations
- Impact the fate of the solar system through your decisions

### Dual Platform Experience

**Desktop (React/Three.js)**
- Full 3D space exploration with realistic orbital mechanics
- Three-panel layout: sidebars for navigation, central viewport, bottom controls
- Immersive graphics powered by React Three Fiber

**Mobile (Phaser 3)**
- 2D RPG-style mini-game for station management
- Touch-optimized controls with virtual joystick
- Slide-in panels for quick access to ship systems
- Synchronized gameplay via WebSocket

## 🎨 Design Philosophy

- **Theme System**: Switch between Classic (cyberpunk orange/cyan) and Monochrome themes
- **Responsive UI**: Optimized for both desktop and mobile experiences
- **Accessibility**: Colorblind modes, font scaling, screen reader support, rebindable controls
- **Real-time Audio**: Dynamic music and sound effects with individual volume controls

## 🛠️ Tech Stack

### Frontend
- **Framework**: React with TypeScript
- **3D Graphics**: Three.js via React Three Fiber
- **Mobile Game Engine**: Phaser 3
- **State Management**: Zustand
- **Styling**: TailwindCSS + Radix UI components
- **Build Tool**: Vite

### Backend
- **Server**: Express.js
- **Database**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM
- **Real-time Communication**: WebSocket via CloudSyncManager
- **Authentication**: Session-based auth

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use Replit's built-in database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd plunderverse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎮 How to Play

1. **Create an account** or play as a guest
2. **Choose your path**: Smuggler, merchant, or bounty hunter
3. **Manage your ship**: Repair, upgrade, and refuel
4. **Trade wisely**: Buy low, sell high across different stations
5. **Complete missions**: Build reputation with factions
6. **Make choices**: Your decisions shape the story and determine your ending

## 🔊 Audio System

The game features a sophisticated audio system with:
- **Master Volume**: Controls overall audio output
- **Category Volumes**: Independent controls for Music, SFX, and Parrot speech
- **Real-time Adjustments**: Volume changes apply immediately to playing audio
- **Mute Functionality**: Mute/unmute without stopping playback

## 🏗️ Project Structure

```
plunderverse/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/          # Utilities and stores
│   │   ├── services/     # API and business logic
│   │   └── public/       # Static assets
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes/           # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
└── replit.md            # Technical documentation

```

## 📝 Development Notes

- **Database Changes**: Use `npm run db:push` to apply schema changes
- **Audio Architecture**: useAudio is the single source of truth for all volume state
- **WebSocket Sync**: All gameplay synchronized via CloudSyncManager
- **Save System**: Multiple save slots with structured JSON format

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns and conventions
- Audio changes maintain the established volume mixing architecture
- UI components support both Classic and Monochrome themes
- Changes work on both desktop and mobile platforms

## 📄 License

This project is for educational and entertainment purposes.

## 🌟 Credits

Inspired by the space western aesthetic of *Firefly* and the economic simulation of classic space trading games.

---

**Current Status**: Active Development

For technical details and architecture documentation, see [replit.md](./replit.md)
