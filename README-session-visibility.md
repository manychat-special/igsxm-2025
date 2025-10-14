# Session Visibility Manager

A JavaScript script for managing session visibility on live event websites based on local time and session datetime.

## Features

- **Automatic State Management**: Automatically shows/hides elements based on session timing
- **Real-time Updates**: Updates every 30 seconds and when page becomes visible
- **Countdown Timer**: Displays live countdown for upcoming sessions
- **Dynamic Content**: Handles dynamically added sessions
- **Webflow Compatible**: Designed for Webflow integration

## Usage

### 1. Include the Script

Add the script to your Webflow site:

```html
<script src="session-visibility.js"></script>
```

### 2. HTML Structure

Structure your sessions with the required data attributes:

```html
<div data-agenda-item 
     data-start-time="2024-01-15T10:00:00Z" 
     data-end-time="2024-01-15T10:30:00Z">
    
    <!-- Before session starts -->
    <div data-before-session>
        <p>Session starting soon!</p>
        <div data-countdown>Loading...</div>
    </div>
    
    <!-- During live session -->
    <div data-during-session style="display: none;">
        <p>🔴 LIVE - Session is now active!</p>
    </div>
    
    <!-- After session ends -->
    <div data-after-session style="display: none;">
        <p>Session has ended. Thank you!</p>
    </div>
</div>
```

### 3. Required Data Attributes

#### Session Container
- `data-agenda-item`: Identifies the session container
- `data-start-time`: Session start time (ISO 8601 format)
- `data-end-time`: Session end time (ISO 8601 format)

#### State-Specific Elements
- `data-before-session`: Elements visible before session starts
- `data-during-session`: Elements visible during live session
- `data-after-session`: Elements visible after session ends

#### Countdown Elements
- `data-countdown`: Elements that display countdown timer

## Session States

### Before Session (`session-before`)
- Session hasn't started yet
- Shows countdown timer
- Elements with `data-before-session` are visible

### During Session (`session-during`)
- Session is currently live
- Elements with `data-during-session` are visible
- Countdown stops updating

### After Session (`session-after`)
- Session has ended
- Elements with `data-after-session` are visible

## CSS Classes

The script automatically adds CSS classes to session containers:

- `.session-before`: Applied when session hasn't started
- `.session-during`: Applied when session is live
- `.session-after`: Applied when session has ended

## JavaScript API

### Access the Manager

```javascript
// The manager is available globally
const manager = window.sessionManager;
```

### Public Methods

#### `refresh()`
Refresh sessions (useful for dynamic content):

```javascript
window.sessionManager.refresh();
```

#### `getCurrentState(sessionElement)`
Get current state of a specific session:

```javascript
const sessionElement = document.querySelector('[data-agenda-item]');
const state = window.sessionManager.getCurrentState(sessionElement);
// Returns: 'before', 'during', or 'after'
```

#### `destroy()`
Clean up intervals (rarely needed):

```javascript
window.sessionManager.destroy();
```

## Countdown Features

### Automatic Formatting
- Days: `2d 5h 30m 15s`
- Hours: `5h 30m 15s`
- Minutes: `30m 15s`
- Seconds: `15s`

### Data Attributes
Countdown elements receive additional data attributes:

```html
<div data-countdown 
     data-days="0" 
     data-hours="2" 
     data-minutes="30" 
     data-seconds="15">
    2h 30m 15s
</div>
```

## Time Format

Use ISO 8601 format for session times:

```javascript
// Examples
data-start-time="2024-01-15T10:00:00Z"        // UTC
data-start-time="2024-01-15T10:00:00-05:00"   // EST
data-start-time="2024-01-15T10:00:00+01:00"   // CET
```

## Performance

- **Lightweight**: Minimal DOM queries and updates
- **Efficient**: Only updates when necessary
- **Memory Safe**: Proper cleanup of intervals
- **Page Visibility**: Pauses updates when page is hidden

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for Date parsing)

## Integration with Webflow

1. Add the script to your Webflow site's custom code
2. Structure your sessions with the required data attributes
3. Style the different states using CSS classes
4. Test with different time zones and session schedules

## Example Styling

```css
.session-before {
    border-left: 4px solid #ffa500;
    background: #fff8e1;
}

.session-during {
    border-left: 4px solid #4caf50;
    background: #e8f5e8;
}

.session-after {
    border-left: 4px solid #9e9e9e;
    background: #f5f5f5;
}

[data-countdown] {
    font-weight: bold;
    color: #ff6b35;
    font-size: 1.2em;
}
```

## Local Timezone Script Integration

The `local-timezone.js` script works alongside session visibility and provides timezone conversion for agenda items.

#### Time Display Elements
- `data-time-copy="start"`: Element to display start time in local format
- `data-time-copy="end"`: Element to display end time in local format  
- `data-time-copy="date"`: Element to display date in local format
- `data-time-copy="tz"`: Element to display timezone abbreviation

### Features
- **Automatic Timezone Detection**: Converts PDT times to user's local timezone
- **Smart Abbreviations**: Shows appropriate timezone abbreviations (BST, CEST, JST, etc.)
- **24-hour Format**: Displays time in 24-hour format
- **Webflow Compatible**: Works with dynamically loaded content

### Sessions Not Updating
- Check browser console for errors
- Verify date format is ISO 8601
- Ensure data attributes are correctly set

### Countdown Not Working
- Make sure elements have `data-countdown` attribute
- Check that session is in 'before' state
- Verify start time is in the future

### Timezone Conversion Issues
- Verify `data-start-time` and `data-end-time` are set
- Check that time display elements have correct `data-time-copy` attributes
- Ensure session container has `data-agenda-item` attribute

### Performance Issues
- Limit number of sessions on page
- Use `destroy()` method if removing sessions dynamically
- Consider pagination for large event schedules
