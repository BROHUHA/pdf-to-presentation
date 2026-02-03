# PDF to HTML Slideshow Converter

Convert PDFs into pixel-perfect, interactive HTML/CSS slideshows with professional templates.

## Features

- **3 Template Styles**: Presentation (Reveal.js), Flip-Book (3D page turning), Documentation (Table of Contents)
- **Interactive Hotspots**: Add clickable link areas to any part of your PDF
- **Lead Generation**: Gate content with a contact form
- **Export Options**: Download as ZIP or deploy to Netlify

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Express.js with TypeScript
- **PDF Conversion**: Docker-based pdf2htmlEX
- **Image Optimization**: Sharp
- **Templates**: Custom HTML/CSS generators

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PDF conversion)

### Installation

1. Clone the repository:
```bash
cd "PDF editor"
```

2. Install frontend dependencies:
```bash
cd client
npm install
```

3. Install backend dependencies:
```bash
cd ../server
npm install
```

4. Pull the pdf2htmlEX Docker image:
```bash
docker pull pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-alpine-3.12.0-x86_64
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd client
npm run dev
```

3. Open http://localhost:3000 in your browser

## Project Structure

```
PDF editor/
├── client/                  # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx     # Main dashboard
│   │       ├── globals.css  # Design system
│   │       └── layout.tsx   # Root layout
│   └── .env.local           # API URL config
│
├── server/                  # Express.js backend
│   ├── src/
│   │   ├── server.ts        # Main entry
│   │   ├── routes/
│   │   │   ├── upload.routes.ts
│   │   │   ├── convert.routes.ts
│   │   │   └── export.routes.ts
│   │   └── services/
│   │       ├── conversion.service.ts
│   │       ├── template.service.ts
│   │       ├── image.service.ts
│   │       └── netlify.service.ts
│   └── .env                 # Server config
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload a PDF file |
| GET | `/api/upload/status/:jobId` | Check job status |
| POST | `/api/convert/:jobId` | Start PDF conversion |
| POST | `/api/export/generate/:jobId` | Generate template output |
| GET | `/api/export/download/:jobId` | Download as ZIP |
| POST | `/api/export/deploy/:jobId` | Deploy to Netlify |

## Templates

### The Presentation
Full-screen slideshow with keyboard/touch navigation. Ideal for pitch decks.

### The Flip-Book
3D page-turning animation for a realistic book experience. Ideal for magazines.

### The Documentation
Vertical scroll layout with sticky Table of Contents. Ideal for whitepapers.

## Configuration

### Backend (.env)
```env
PORT=3001
MAX_FILE_SIZE=52428800
DOCKER_IMAGE=pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-alpine-3.12.0-x86_64
NETLIFY_ACCESS_TOKEN=your_token_here
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## License

MIT
