# LastMart Mobile App (React Native / Expo)

## Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Android Studio (for Android) or Xcode (for iOS)

## Setup

```bash
cd mobile
npm install

# Set your backend URL
echo 'EXPO_PUBLIC_API_URL=https://your-backend.railway.app' > .env
```

## Run in Development

```bash
# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator (macOS only)
npx expo start --ios

# Run in browser (limited functionality)
npx expo start --web
```

## Build for Production

### Using EAS Build (Recommended)
```bash
# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build for Android (APK)
eas build --platform android --profile preview

# Build for iOS (IPA)
eas build --platform ios

# Build for both
eas build --platform all
```

### Local Build
```bash
# Android APK
npx expo build:android

# iOS IPA (macOS only)
npx expo build:ios
```

## App Structure

```
mobile/
├── app/
│   ├── (tabs)/          # Bottom tab navigation
│   │   ├── index.tsx    # Home screen
│   │   ├── marketplace.tsx
│   │   ├── cart.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── auth/            # Login & register screens
│   ├── product/[id].tsx # Product detail
│   ├── vendor/[id].tsx  # Vendor store
│   ├── checkout.tsx     # Checkout flow
│   └── payment.tsx      # Paystack payment webview
├── src/
│   ├── lib/api.ts       # API client
│   ├── components/      # Shared UI components
│   ├── hooks/           # Custom React Native hooks
│   └── store/           # Zustand state management
├── assets/              # Icons, splash screen, fonts
├── app.json             # Expo config
└── package.json
```

## Features
- 🏪 Browse vendors and products
- 🛒 Shopping cart and checkout
- 💳 Paystack payment (in-app WebView)
- 🔔 Push notifications (Expo Notifications)
- 📍 Location-based vendor discovery
- 📸 KYC document upload (camera/gallery)
- 🌐 Multi-language (English, Yoruba, Hausa, Igbo)
- 👤 Customer & vendor dashboards

## Environment Variables
```env
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
```
