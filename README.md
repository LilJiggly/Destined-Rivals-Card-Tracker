# Pokemon Card Collection Tracker

A modern, responsive web application for tracking your Pokemon card collection with Firebase synchronization.

## Features

- ✨ **Modern UI**: Beautiful gradient topbar with glass-morphism effects
- 📱 **Responsive Design**: Optimized for both desktop and mobile devices
- 🔐 **Firebase Authentication**: Sign in to sync your collection across devices
- ☁️ **Cloud Sync**: Your collection is automatically saved to Firebase Firestore
- 🌙 **Dark/Light Theme**: Toggle between themes with smooth transitions
- 🔍 **Advanced Filtering**: Search by name, filter by tags, and show only owned cards
- 📊 **Collection Stats**: Track your progress with owned card counters

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Choose your preferred location
5. Get your Firebase configuration:
   - Go to Project Settings > General tab
   - Scroll down to "Your apps" section
   - Copy the Firebase SDK configuration

### 2. Configure the App

1. Open `firebase-config.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
export const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id",
};
```

### 3. Run the Application

1. Serve the files using a local web server (required for ES6 modules):

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

2. Open your browser and navigate to `http://localhost:8000`

## Usage

### Authentication

- Click "Sign Up" to create a new account
- Click "Sign In" to log into an existing account
- Your collection will automatically sync when signed in

### Managing Your Collection

- Click on any card to mark it as owned/not owned
- Use the search bar to find specific cards
- Filter by tags using the tag checkboxes
- Use "Show Owned" to see only cards you own
- Sort by card number or name

### Theme Toggle

- Use the switch in the top bar to toggle between light and dark themes
- Your theme preference is saved locally

## File Structure

```
├── index.html              # Main HTML file
├── styles.css              # All styling and responsive design
├── scripts.js              # JavaScript functionality and Firebase integration
├── firebase-config.js      # Firebase configuration (customize this)
├── cards.json              # Card data
├── generate_cards_json.py  # Script to generate card data
└── images/                 # Card images
```

## Customization

### Adding New Cards

1. Update `cards.json` with new card data
2. Add corresponding images to the `images/` folder
3. Run `generate_cards_json.py` if you have a CSV file to convert

### Styling

- Modify CSS variables in `styles.css` to change colors and themes
- The design uses CSS custom properties for easy theming

### Firebase Rules

For security, consider adding Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Browser Compatibility

- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

## License

This is a fan-made project for personal use. All Pokémon names, images, and trademarks are © Nintendo, Creatures Inc., GAME FREAK inc., or their respective owners.
