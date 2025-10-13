document.addEventListener("DOMContentLoaded", function() {
  const memberstack = window.$memberstackDom;
  let isLoggedIn = false;
  let savedItems = [];

  async function checkMemberLogin() {
    try {
      const member = await memberstack.getCurrentMember();
      return !!member;
    } catch (error) {
      return false;
    }
  }

  function getSavedItems(memberData) {
    return memberData.savedItems || [];
  }

  function updateButtonVisibility() {
    const saveButtons = document.querySelectorAll('[ms-code-save]');
    const unsaveButtons = document.querySelectorAll('[ms-code-unsave]');

    saveButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-save');
      button.style.display = !savedItems.includes(itemId) ? 'block' : 'none';
    });

    unsaveButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-unsave');
      button.style.display = savedItems.includes(itemId) ? 'block' : 'none';
    });
  }

  function updateItemVisibility() {
    const saveLists = document.querySelectorAll('[ms-code-save-list]');
    saveLists.forEach(list => {
      const filter = list.getAttribute('ms-code-save-list');
      const items = list.querySelectorAll('[ms-code-save-item]');
      items.forEach(item => {
        const saveButton = item.querySelector('[ms-code-save]');
        if (!saveButton) {
          item.style.display = 'block';
          return;
        }
        const itemId = saveButton.getAttribute('ms-code-save');
        
        if (!isLoggedIn || filter === 'all') {
          item.style.display = 'block';
        } else if (filter === 'saved' & savedItems.includes(itemId)) {
          item.style.display = 'block';
        } else if (filter === 'unsaved' & !savedItems.includes(itemId)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  async function handleButtonClick(event) {
    if (!isLoggedIn) return;

    const button = event.currentTarget;
    const action = button.getAttribute('ms-code-save') ? 'save' : 'unsave';
    const itemId = button.getAttribute(action === 'save' ? 'ms-code-save' : 'ms-code-unsave');
    
    if (action === 'save' && !savedItems.includes(itemId)) {
      savedItems.push(itemId);
    } else if (action === 'unsave') {
      savedItems = savedItems.filter(id => id !== itemId);
    }

    try {
      await memberstack.updateMemberJSON({ json: { savedItems } });
    } catch (error) {
      // Silently handle the error
    }

    updateButtonVisibility();
    updateItemVisibility();
  }

  function addClickListeners() {
    const saveButtons = document.querySelectorAll('[ms-code-save]');
    const unsaveButtons = document.querySelectorAll('[ms-code-unsave]');
    saveButtons.forEach(button => button.addEventListener('click', handleButtonClick));
    unsaveButtons.forEach(button => button.addEventListener('click', handleButtonClick));
  }

  async function initializeScript() {
    isLoggedIn = await checkMemberLogin();

    if (isLoggedIn) {
      try {
        const result = await memberstack.getMemberJSON();
        const memberData = result.data || {};
        savedItems = getSavedItems(memberData);
      } catch (error) {
        // Silently handle the error
      }
    }

    updateButtonVisibility();
    updateItemVisibility();
    addClickListeners();

    // Set up a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
        }
      });
      if (shouldUpdate) {
        updateButtonVisibility();
        updateItemVisibility();
        addClickListeners();
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
  }

  initializeScript();
});