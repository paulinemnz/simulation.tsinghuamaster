# Add Your Image Files Here

## Instructions

1. **Place your SEM logo file here** with one of these names:
   - `sem-logo.png`
   - `sem-logo.jpg`
   - `sem-logo.jpeg`

2. **Place your robot image file here** with one of these names:
   - `robot-image.png`
   - `robot-image.jpg`
   - `robot-image.jpeg`

## After Adding Files

Once you've added your PNG/JPG files, update `LandingPage.tsx`:

Change these lines (around line 6-7):
```typescript
import semLogo from '../../assets/images/sem-logo.svg';
import robotImage from '../../assets/images/robot-image.svg';
```

To:
```typescript
import semLogo from '../../assets/images/sem-logo.png';  // or .jpg
import robotImage from '../../assets/images/robot-image.png';  // or .jpg
```

## Current Status

✅ SVG placeholder versions are currently being used and will display on the landing page.
