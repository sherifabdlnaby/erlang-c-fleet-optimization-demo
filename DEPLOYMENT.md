# Deployment Guide for GitHub Pages

This guide will help you deploy the Erlang C Visualizer to GitHub Pages.

## Prerequisites

1. A GitHub account
2. Git installed on your machine
3. Node.js and npm installed

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `erlang-c` (or your preferred name)
3. **Important**: Make it public if you want free GitHub Pages hosting
4. Do NOT initialize with README, .gitignore, or license (if you already have local files)

## Step 2: Update package.json

1. Open `package.json`
2. Replace `YOUR_USERNAME` in the `homepage` field with your GitHub username:
   ```json
   "homepage": "https://yourusername.github.io/erlang-c"
   ```
   Or if your repository name is different:
   ```json
   "homepage": "https://yourusername.github.io/your-repo-name"
   ```

## Step 3: Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit"
```

## Step 4: Connect to GitHub Repository

```bash
git remote add origin https://github.com/YOUR_USERNAME/erlang-c.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `erlang-c` with your actual GitHub username and repository name.

## Step 5: Deploy to GitHub Pages

Run the deployment command:

```bash
npm run deploy
```

This will:
1. Build your React app for production
2. Create a `gh-pages` branch
3. Push the built files to GitHub Pages

## Step 6: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings**
3. Scroll down to **Pages** section
4. Under **Source**, select `gh-pages` branch
5. Click **Save**

## Step 7: Access Your Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/erlang-c
```

**Note**: It may take a few minutes for GitHub Pages to update after deployment.

## Updating Your Site

Whenever you make changes:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. Deploy the updated site:
   ```bash
   npm run deploy
   ```

## Troubleshooting

### Build Fails
- Make sure all dependencies are installed: `npm install`
- Check for TypeScript/ESLint errors: `npm run build`

### 404 Errors
- Verify the `homepage` field in `package.json` matches your repository URL
- Make sure GitHub Pages is enabled and pointing to `gh-pages` branch
- Clear your browser cache

### Assets Not Loading
- Check that the `homepage` field in `package.json` is correct
- Ensure all asset paths are relative (React handles this automatically)

### URL Parameters Not Working
- GitHub Pages serves static files, so client-side routing should work fine
- If using React Router, make sure you're using HashRouter or configure basename

## Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file in the `public` folder with your domain name
2. Configure DNS settings with your domain provider
3. Update GitHub Pages settings to use your custom domain

## Continuous Deployment (Optional)

You can set up GitHub Actions to automatically deploy on every push to main:

1. Create `.github/workflows/deploy.yml`
2. Add workflow configuration (see GitHub Actions documentation)
