window.$memberstackDom.getCurrentMember().then(async ({ data }) => {
    const comments = document.createElement('hyvor-talk-comments');
    comments.setAttribute('website-id', 14188);
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
    
    if (data) {
      const email = data.auth.email;
      
      // Get name from custom fields or fallback to email username
      let userName = email.replace(/@.+/, ''); // Default fallback
      
      if (data.customFields) {
        const firstName = data.customFields['first-name'] || data.customFields['firstName'] || '';
        const lastName = data.customField- s['last-name'] || data.customFields['lastName'] || '';
        
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
      
      // Create user object
      const ssoUser = {
        timestamp: Math.floor(Date.now() / 1000),
        id: data.id,
        name: userName,
        email: email,
        picture_url: avatarUrl,
        bio: userBio
      };
      
      // Properly encode to handle special characters
      const encodedUser = btoa(unescape(encodeURIComponent(JSON.stringify(ssoUser))));
      
      comments.setAttribute('sso-user', encodedUser);
    }
    document.getElementById("chat_embed").appendChild(comments);
  });