window.$memberstackDom.getCurrentMember().then(async ({ data }) => {
    const comments = document.createElement('hyvor-talk-comments');
    comments.setAttribute('website-id', 14188);
    
    // Set page-id from various sources
    let pageId = null;
    
    // 1. Check for data attribute on the container
    const container = document.getElementById("chat_embed");
    if (container && container.dataset.pageId) {
        pageId = container.dataset.pageId;
    }
    
    // 2. Check for data attribute on the script tag
    const scriptTag = document.querySelector('script[src*="hyvor-integration.js"]');
    if (scriptTag && scriptTag.dataset.pageId) {
        pageId = scriptTag.dataset.pageId;
    }
    
    // 3. Use current page URL as fallback
    if (!pageId) {
        pageId = window.location.pathname + window.location.search;
    }
    
    comments.setAttribute('page-id', pageId);
    
    // Set theme/colors from container data attribute
    if (container && container.dataset.theme) {
        comments.setAttribute('colors', container.dataset.theme);
    }
    
    comments.setAttribute('t-comment-button-text', '↑');
    comments.setAttribute('t-reply-button-text', '↑');
    comments.setAttribute('t-ago-seconds', '* s');
    comments.setAttribute('t-ago-second', '1 s');
    comments.setAttribute('t-ago-minutes', '* m');
    comments.setAttribute('t-ago-minute', '1 m');
    comments.setAttribute('t-ago-hours', '* h');
    comments.setAttribute('t-ago-hour', '1 h');
    comments.setAttribute('t-ago-days', '* d');
    comments.setAttribute('t-ago-day', '1 d');
    comments.setAttribute('t-just-now', 'now');
    comments.setAttribute('t-featured', '📍');
    comments.setAttribute('t-loved-by', '❤️');
    comments.setAttribute('t-edit', '↑');
    comments.setAttribute('t-cancel', '✕');
    comments.setAttribute('t-comments-multi', '* messages');
    comments.setAttribute('t-comments-1', '1 message');
    comments.setAttribute('t-comments-0', '0 messages');
    comments.setAttribute('t-no-comments-text', 'No messages yet!');
    
    if (data) {
      const email = data.auth.email;
      
      // Get name from custom fields or fallback to email username
      let userName = email.replace(/@.+/, ''); // Default fallback
      
      if (data.customFields) {
        const firstName = data.customFields['first-name'] || data.customFields['firstName'] || '';
        const lastName = data.customFields['last-name'] || data.customFields['lastName'] || '';
        
        if (firstName || lastName) {
          userName = `${firstName} ${lastName}`.trim();
        }
      }
      
      // Get avatar URL from profileImage or customFields
      let avatarUrl = data.profileImage || 
                      (data.customFields && data.customFields.avatar) || 
                      null;
      
      // Get bio from custom fields
      let userBio = (data.customFields && data.customFields.bio) || null;
      
      // Build website URL from Instagram handle/link
      let websiteUrl = null;
      if (data.customFields && data.customFields.ighandle) {
        let input = data.customFields.ighandle.trim();
        
        // Extract handle from various input formats
        let handle = null;
        
        // Handle full Instagram URLs
        const igUrlPattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i;
        const urlMatch = input.match(igUrlPattern);
        if (urlMatch) {
          handle = urlMatch[1];
        } else {
          // Handle @handle or just handle format
          handle = input.replace(/^@/, '').replace(/\s+/g, '');
        }
        
        // Clean and validate handle
        if (handle) {
          // Remove any remaining invalid characters
          handle = handle.replace(/[^a-zA-Z0-9._]/g, '');
          
          // Only create URL if handle is valid and not empty
          if (handle.length > 0 && handle.length <= 30) { // Instagram handles are max 30 chars
            websiteUrl = `https://instagram.com/${handle}`;
          }
        }
      }
      
      // Create user object
      const ssoUser = {
        timestamp: Math.floor(Date.now() / 1000),
        id: data.id,
        name: userName,
        email: email,
        picture_url: avatarUrl,
        bio: userBio,
        website_url: websiteUrl
      };
      
      // Properly encode to handle special characters
      const encodedUser = btoa(unescape(encodeURIComponent(JSON.stringify(ssoUser))));
      
      comments.setAttribute('sso-user', encodedUser);
    }
    document.getElementById("chat_embed").appendChild(comments);
  });