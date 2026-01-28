# File Upload Setup (Uploadthing)

The application now supports direct file uploads for employee documents in the onboarding flow.

## Setup Instructions

1. **Create an Uploadthing account** (free tier available):
   - Go to [https://uploadthing.com](https://uploadthing.com)
   - Sign up with your email or GitHub

2. **Get your API keys**:
   - Go to your [Uploadthing Dashboard](https://uploadthing.com/dashboard)
   - Click on your app or create a new one
   - Copy your `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`

3. **Add environment variables**:
   Add the following to your `.env` file:
   ```bash
   UPLOADTHING_SECRET="sk_live_..."
   UPLOADTHING_APP_ID="your-app-id"
   ```

4. **Restart your development server**:
   ```bash
   npm run dev
   ```

## Features

- **Dual mode**: Employees can either upload files directly OR paste URLs
- **Supported file types**: PDF, PNG, JPG, JPEG, GIF, etc.
- **File size limit**: 4MB per file
- **Secure storage**: Files are stored on Uploadthing's CDN with secure URLs

## Usage

In the Former Employment onboarding step, employees will see:
- **Upload File** button: Click to select and upload a file from their device
- **Paste URL** button: Switch to URL input mode to paste links from Google Drive, Dropbox, etc.

Uploaded files are automatically saved and can be viewed/removed after upload.

## Free Tier Limits

Uploadthing free tier includes:
- 2GB storage
- 2GB bandwidth per month
- Unlimited file uploads

This should be sufficient for most use cases. You can upgrade if needed.

## Alternative: Use URL-only mode

If you don't want to set up Uploadthing, the form will still work - employees can just use the "Paste URL" mode to provide links to documents hosted elsewhere (Google Drive, Dropbox, etc.).

The upload functionality will gracefully degrade if Uploadthing credentials are not configured.
