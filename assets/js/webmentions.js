(function() {
  class WebmentionHandler {
    constructor(targetSelector = '#webmentions') {
        this.targetSelector = targetSelector;
        this.container = null;
        this.cache = new Map();
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        this.initialized = true;
    }

    setup() {
        this.container = document.querySelector(this.targetSelector);
        if (!this.container) {
            console.log('Webmention container not found');
            return;
        }

        // Show loading state
        this.container.innerHTML = '<div class="wm-loading">Loading mentions...</div>';
        
        const pageUrl = window.location.href.replace(/#.*$/, '');
        console.log('Fetching webmentions for:', pageUrl);
        
        this.fetchWebmentions(pageUrl)
            .then(mentions => this.renderWebmentions(mentions))
            .catch(error => this.handleError(error));
    }

    async fetchWebmentions(targetUrl) {
          // Check cache first
          if (this.cache.has(targetUrl)) {
              return this.cache.get(targetUrl);
          }

          try {
              // Create both www and non-www versions of the URL
              const url = new URL(targetUrl);
              let targets = [];
              
              // If URL has www, add non-www version
              if (url.hostname.startsWith('www.')) {
                  targets.push(targetUrl);
                  targets.push(targetUrl.replace('www.', ''));
              } else {
                  // If URL doesn't have www, add www version
                  targets.push(targetUrl);
                  targets.push(targetUrl.replace('://', '://www.'));
              }

              // Create the endpoint URL with both targets
              const endpoint = 'https://webmention.io/api/mentions.jf2?' + 
                  targets.map(t => 'target[]=' + encodeURIComponent(t)).join('&');
                  
              console.log('Fetching from endpoint:', endpoint);

              const response = await fetch(endpoint);
              
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              console.log('Received webmentions:', data);

              // Cache both URL versions
              targets.forEach(t => this.cache.set(t, data));
              
              return data;
          } catch (error) {
              console.error('Error fetching webmentions:', error);
              throw error;
          }
      }

    renderWebmentions(data) {
      if (!this.container) return;

      if (!data.children || data.children.length === 0) {
          this.container.style.display = 'none'; // Hide the container if no mentions
          return;
      }
      this.container.style.display = ''; // Ensure container is visible if there are mentions

      // Group by type
      const reactions = data.children.filter(m => 
          ['like-of', 'repost-of', 'bookmark-of'].includes(m['wm-property'])
      );
      const mentions = data.children.filter(m => 
          ['mention-of', 'in-reply-to'].includes(m['wm-property'])
      );

      let html = '<div class="wm-container">';

      // Render header and reactions grid
      html += `
          <h3 class="wm-header">Mentions around the web</h3>
          <div class="wm-avatar-grid">
              ${reactions.map(reaction => this.renderAvatar(reaction)).join('')}
              <span class="wm-reactions-count">${reactions.length} Likes and Retweets</span>
          </div>
      `;

      // Render mentions/comments with show more functionality
      if (mentions.length > 0) {
          html += `
              <div class="wm-mentions-list">
                  ${mentions.map(mention => this.renderMention(mention)).join('')}
              </div>
              ${mentions.length > 4 ? 
                  `<button class="wm-show-more">Show ${mentions.length - 4} more</button>` : 
                  ''
              }
          `;
      }

      html += '</div>';
      this.container.innerHTML = html;

      // Add show more functionality
      const showMoreBtn = this.container.querySelector('.wm-show-more');
      if (showMoreBtn) {
          showMoreBtn.addEventListener('click', () => {
              this.container.querySelector('.wm-mentions-list').classList.add('wm-show-all');
              showMoreBtn.style.display = 'none';
          });
      }
    }


    renderAvatar(reaction) {
        const author = reaction.author || {};
        const defaultAvatar = 'https://webmention.io/avatar/default.svg';
        
        return `
            <a href="${reaction.url}" 
               class="wm-avatar-link" 
               target="_blank" 
               rel="noopener noreferrer"
               title="${author.name || 'Someone'} ${this.getReactionText(reaction['wm-property'])}">
                <img src="${author.photo || defaultAvatar}"
                     alt="${author.name || 'Anonymous'}"
                     loading="lazy"
                     class="wm-avatar-img"
                     onerror="this.src='${defaultAvatar}'">
            </a>
        `;
    }

    renderMention(mention) {
      const author = mention.author || {};
      const date = new Date(mention.published || mention['wm-received'])
          .toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
          });

      return `
          <div class="wm-mention-item">
              <img src="${author.photo || 'https://webmention.io/avatar/default.svg'}"
                   alt="${author.name || 'Anonymous'}"
                   loading="lazy"
                   class="wm-author-img">
              
              <div class="wm-mention-content-wrapper">
                  <div class="wm-mention-header">
                      <a href="${author.url || mention.url}" 
                         class="wm-author-name" 
                         target="_blank" 
                         rel="noopener noreferrer">
                          ${author.name || 'Anonymous'}
                      </a>
                      <span class="wm-mention-metadata">
                          ${this.getMentionType(mention['wm-property'])} on
                          <a href="${mention.url}" 
                             class="wm-mention-source" 
                             target="_blank" 
                             rel="noopener noreferrer">
                              ${this.getSourceName(mention.url)}
                          </a>
                          — ${date}
                      </span>
                  </div>
                  ${mention.content?.text ? `
                      <div class="wm-mention-content">
                          ${this.formatContent(mention.content.text)}
                      </div>
                  ` : ''}
              </div>
          </div>
      `;
    }


    getReactionText(type) {
        const texts = {
            'like-of': 'liked this',
            'repost-of': 'reposted this',
            'bookmark-of': 'bookmarked this'
        };
        return texts[type] || 'reacted to this';
    }

    getMentionType(type) {
        const types = {
            'mention-of': 'mentioned',
            'in-reply-to': 'replied to'
        };
        return types[type] || 'mentioned';
    }

    getSourceName(url) {
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            // Get first part of domain and capitalize it
            return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
        } catch (e) {
            return 'Link';
        }
    }

    formatContent(text) {
        // Escape HTML
        const escaped = text.replace(/[&<>"']/g, char => ({
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#39;'
        }[char]));

        // Truncate if too long
        const maxLength = 280;
        if (escaped.length > maxLength) {
            return escaped.substring(0, maxLength) + '...';
        }

        return escaped;
    }

    handleError(error) {
        if (!this.container) return;
        console.error('Webmention error:', error);
        this.container.innerHTML = '<div class="wm-error">Error loading mentions</div>';
    }
  }

  // Initialize webmentions
  const webmentions = new WebmentionHandler();
  webmentions.init();
})();
