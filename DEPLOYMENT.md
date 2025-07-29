# Deployment Guide

## 🚀 GitHub Pages Deployment

### 1. **Firebase Security Note**

Your Firebase config values in `firebase-config.js` are **safe to commit to GitHub**. These are public identifiers that are meant to be exposed in client-side applications. Your actual security comes from:

- Firebase Authentication (user login required)
- Firestore security rules (data access control)

### 2. **Deploy to GitHub Pages**

#### Option A: Using GitHub Actions (Recommended)

1. Go to your GitHub repo → Settings → Pages
2. Source: "GitHub Actions"
3. Your site will auto-deploy on every push to main branch

#### Option B: Manual Branch Deployment

1. Go to your GitHub repo → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` (or `gh-pages`)
4. Folder: `/ (root)`

### 3. **Firebase Setup for Production**

#### Enable Authentication:

1. Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password"
3. Add your GitHub Pages domain to authorized domains:
   - Go to Authentication → Settings → Authorized domains
   - Add: `yourusername.github.io`

#### Set Up Firestore:

1. Firebase Console → Firestore Database → Create database
2. Start in production mode
3. Add these security rules:

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

### 4. **Testing Your Live Site**

1. Push your code to GitHub
2. Wait for GitHub Pages to deploy (usually 1-2 minutes)
3. Visit `https://yourusername.github.io/your-repo-name`
4. Test the authentication flow
5. Mark some cards as owned and refresh to test sync

### 5. **Updating Your Live Site**

- Just push changes to your main branch
- GitHub Pages will automatically redeploy
- Changes typically appear within 1-2 minutes

### 6. **Troubleshooting**

- **CORS errors**: Make sure your domain is added to Firebase authorized domains
- **Module errors**: GitHub Pages supports ES6 modules by default
- **Authentication issues**: Check Firebase console for error logs
- **Data not syncing**: Verify Firestore rules are set correctly

Your Pokemon card tracker will be live and accessible from anywhere! 🎉
