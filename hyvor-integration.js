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
    comments.setAttribute('t-featured', '⭐');
    comments.setAttribute('t-loved-by', '❤️');
    comments.setAttribute('t-edit', '↑');
    
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
      
      // Build website URL from Instagram handle
      let websiteUrl = null;
      if (data.customFields && data.customFields.ighandle) {
        let handle = data.customFields.ighandle.trim();
        
        // Clean up the handle
        handle = handle.replace(/^@/, ''); // Remove @ if present at start
        handle = handle.replace(/\s+/g, ''); // Remove spaces
        handle = handle.replace(/[^a-zA-Z0-9._]/g, ''); // Keep only valid Instagram characters
        
        // Only create URL if handle has content after cleaning
        if (handle.length > 0) {
          // Check if it already includes instagram.com
          if (handle.includes('instagram.com')) {
            handle = handle.split('instagram.com/').pop();
          }
          
          websiteUrl = `https://instagram.com/${handle}`;
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