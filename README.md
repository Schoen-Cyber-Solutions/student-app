# Schoen Cyber Solutions Student App

A security-first mobile platform designed to connect verified university students with their courses, schedules, classmates, and the wider student community.

> **Status:** Early development / MVP

## About

The Student App is being developed by Schoen Cyber Solutions LLC as a mobile platform for university students.

The application is designed around three core principles:

- Verified university communities
- Pseudonymous social interaction
- Minimal collection of personal data

The initial development focus is on universities using Blackboard Learn, with Chicago serving as the initial target market.

## Planned MVP Features

- University email verification
- Secure user authentication
- Blackboard Learn integration
- Course discovery and membership verification
- Student course calendar
- Course and classroom information when available
- Class-specific community chats
- University-wide student community
- Chicago-wide student community
- Pseudonymous usernames
- Reporting, blocking, and moderation controls

## Technology

- React Native
- Expo
- TypeScript
- Expo Router
- Native iOS development with Xcode
- Blackboard Learn REST API (planned)

## Development

### Requirements

- Node.js 22+
- npm
- Xcode
- iOS 16.4 or later
- Expo development environment

### Install Dependencies

After cloning the repository, install the project dependencies:

```bash
npm ci
```

### Start the Development Server

Start the Metro development server:

```bash
npx expo start --dev-client
```

To start Metro with a cleared cache:

```bash
npx expo start --dev-client --clear
```

### iOS Development

The project uses an Expo development build for native iOS testing.

Generate the native iOS project locally with:

```bash
npx expo prebuild --platform ios
```

The generated `ios/` directory is not tracked in Git and can be recreated locally when needed.

During development, keep the Metro server running and open the installed development build on the iPhone. Changes to the React Native source code are automatically reflected through Fast Refresh.

