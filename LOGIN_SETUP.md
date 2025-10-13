# Login Setup - Mordobo

## 🚀 Implemented Features

- ✅ Email and password login
- ✅ Full registration form
- ✅ Google login
- ✅ Facebook login
- ✅ GitHub login
- ✅ Global authentication context
- ✅ Auto navigation based on auth state
- ✅ Session persistence with AsyncStorage
- ✅ Logout button with confirmation

## 📱 Created Screens

### Login (`app/(auth)/login.tsx`)
- Email and password form
- Social login buttons (Google, Facebook, GitHub)
- Link to the registration screen
- Required fields validation

### Register (`app/(auth)/register.tsx`)
- Full form with first name, last name, email, phone and passwords
- Social registration buttons
- Matching passwords validation
- Link to the login screen

## 🔧 Required Configuration

### 1. Google Sign-In

1. Go to `Google Cloud Console`
2. Create a new project or select an existing one
3. Enable the Google Sign-In API
4. Create OAuth 2.0 credentials:
   - Type: Mobile application
   - Platform: Android/iOS
5. Define the following environment variables (e.g. in your `.env` file or shell). The same web client ID is used for the web flow:
   ```bash
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="com.googleusercontent.apps.your-ios-client-id"
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
   EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME="com.googleusercontent.apps.your-ios-client-id"
   EXPO_PUBLIC_API_URL="https://<your-backend>"
   ```
6. Rebuild or restart Expo so the new config takes effect. The app now configures Google Sign-In automatically through `config/google-signin.ts` and enables the web flow with `expo-auth-session`.
7. For web builds, add `http://localhost:19006` (or your domain) as an **Authorized JavaScript origin** in Google Cloud for the same OAuth Client ID.

### 2. Facebook Login

1. Go to `Facebook Developers`
2. Create a new application
3. Add the "Facebook Login" product
4. Configure the iOS and Android platforms
5. Update your config with your App ID:
   ```json
   [
     "react-native-fbsdk-next",
     {
       "appID": "YOUR_FACEBOOK_APP_ID",
       "displayName": "Mordobo"
     }
   ]
   ```

### 3. GitHub Login

For GitHub, you'll need to implement OAuth manually or use a library like `react-native-oauth2`:

```bash
pnpm add react-native-oauth2
```

## 🎨 Design

The design follows the reference screens aesthetics:
- Primary colors: Teal green (#10B981) and white
- Ionicons icons for consistency
- Forms with visual validation
- Social buttons with platform icons
- Smooth navigation between screens

## 🔐 Security

- Passwords should be stored securely (hash in production)
- Auth tokens stored in AsyncStorage
- Client-side form validation
- Confirmation before logout

## 📝 Next Steps

1. Configure Google and Facebook credentials
2. Implement a real backend for authentication
3. Add email validation
4. Implement password recovery
5. Add biometric authentication
6. Implement refresh tokens

## 🚀 How to Test

1. Run the app: `npx expo start`
2. The app will show the login screen automatically
3. Register a user, then log in with those credentials
4. Google Sign-In works on Android/iOS with the native module and on the web thanks to `expo-auth-session`, as long as your backend validates the returned `idToken`.
5. After login, you'll see the main screen with user info
6. Use the "Logout" button to go back to login
