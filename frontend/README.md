# DataDynamics Frontend

This is the frontend application for DataDynamics, a modern data analytics and visualization platform. The frontend is built using React, TypeScript, and Vite, providing a fast and responsive user interface for data exploration and analysis.

## Project Structure

```
frontend/
├── client/                 # Main frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── build/             # Production build output
├── server/                # Frontend server
├── selekt-charts/         # Charting components
├── scripts/               # Build and utility scripts
└── docs/                  # Documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Build for production:
   ```bash
   npm run build
   # or
   yarn build
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm run lint` - Run ESLint and Prettier checks
- `npm run fixlint` - Fix linting issues automatically

## Key Features

- Modern React with TypeScript
- Vite for fast development and building
- Real-time data visualization
- Interactive SQL query editor
- Responsive design
- Chart generation and customization
- Chat interface for query assistance

## Tech Stack

- **Framework**: React 16.14.0
- **Language**: TypeScript 4.9.5
- **Build Tool**: Vite 4.1.1
- **State Management**: Zustand 4.3.2
- **Routing**: React Router 5.3.0
- **UI Components**:
  - Reach UI (@reach/dialog, @reach/menu-button)
  - React Ace (code editor)
  - React Split Pane
  - TauCharts (data visualization)
- **Utilities**:
  - Lodash
  - UUID
  - SWR (data fetching)
  - LocalForage (offline storage)

## Development

### Code Style

The project uses ESLint and Prettier for code formatting and linting. The configuration can be found in:

- `.eslintrc`
- `.prettierrc`

### TypeScript

TypeScript is used throughout the project for type safety. Configuration can be found in `tsconfig.json`.

## Browser Support

The application supports modern browsers:

- Chrome
- Firefox
- Safari
- Edge

IE11 and older browsers are not supported.

## Contributing

1. Follow the existing code style
2. Write meaningful commit messages
3. Run tests and linting before submitting PRs
4. Update documentation as needed

## License

Private - All rights reserved
