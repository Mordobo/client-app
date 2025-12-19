# client-app

Mobile app for Mordobo clients to browse, book, and manage home services. Built with [Expo](https://expo.dev) and React Native.

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the `app` directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Resetting the Starter Code

When you're ready for a clean slate, run:

```bash
npm run reset-project
```

This command moves the starter code to the `app-example` directory and creates a blank `app` directory where you can begin developing.

## Building & Distribution

This project uses EAS Build for creating native builds and supports multiple distribution methods:

- **Firebase App Distribution** - Recommended for both Android and iOS
- **TestFlight** - For iOS testing
- **GitHub Releases** - Direct download links

### Quick Start

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build Android staging
npm run build:android:staging

# Build iOS staging
npm run build:ios:staging
```

### Documentation

- **[Distribution Setup Guide](./docs/DISTRIBUTION_SETUP.md)** - Complete setup instructions
- **[App Distribution Guide](./docs/APP_DISTRIBUTION.md)** - Comprehensive distribution documentation
- **[Installation for Testers](./docs/INSTALLATION_FOR_TESTERS.md)** - Guide for testers installing the app

### CI/CD

Builds are automatically triggered:
- Push to `develop` → Staging builds
- Push to `main` → Production builds

See [GitHub Actions workflow](.github/workflows/build-and-distribute.yml) for details.

## Learn More

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals or dive into advanced topics with guides.
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Build a project that runs on Android, iOS, and the web.
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/): Learn about building native apps with EAS.

## Community

- [Expo on GitHub](https://github.com/expo/expo): View the open source platform and contribute.
- [Expo Discord](https://chat.expo.dev): Chat with the Expo community and ask questions.
