/**
 * HOTEL CHOLA THEME — Shopify OS 2.0
 * Consolidated JavaScript
 * Handles: Mobile menu, Carousel, Ajax Cart API, Floating cart, Search
 */

(function () {
    'use strict';

    /* ============================================
       MOBILE MENU TOGGLE
       ============================================ */
    function initMobileMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileMenu = document.querySelector('.mobile-menu');
        if (!hamburger || !mobileMenu) return;

        hamburger.addEventListener('click', function () {
            const lines = hamburger.querySelectorAll('.hamburger-line');
            const isOpen = mobileMenu.classList.toggle('is-open');
            lines.forEach(function (line) {
                line.classList.toggle('active', isOpen);
            });
        });

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('is-open');
                hamburger.querySelectorAll('.hamburger-line').forEach(function (line) {
                    line.classList.remove('active');
                });
            }
        });
    }

    /* ============================================
       IMAGE CAROUSEL
       ============================================ */
    function initCarousel() {
        const carousels = document.querySelectorAll('.carousel-container');
        carousels.forEach(function (container) {
            const slides = container.querySelectorAll('.carousel-slide');
            if (slides.length <= 1) return;

            let currentSlide = 0;
            const speed = parseInt(container.dataset.speed) || 3000;

            function updateSlides() {
                slides.forEach(function (slide, index) {
                    slide.style.transform = 'translateX(' + ((index - currentSlide) * 100) + '%)';
                });
            }

            updateSlides();

            setInterval(function () {
                currentSlide = (currentSlide + 1) % slides.length;
                updateSlides();
            }, speed);
        });
    }

    /* ============================================
       SHOPIFY AJAX CART API
       ============================================ */
    const ShopifyCart = {
        /**
         * Add item to cart
         * @param {number} variantId - Shopify variant ID
         * @param {number} quantity - Quantity to add
         */
        addToCart: function (variantId, quantity) {
            quantity = quantity || 1;
            return fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        id: variantId,
                        quantity: quantity
                    }]
                })
            })
                .then(function (response) {
                    if (!response.ok) throw new Error('Add to cart failed');
                    return response.json();
                })
                .then(function (data) {
                    ShopifyCart.showNotification('Added to cart!');
                    ShopifyCart.updateCartUI();
                    return data;
                })
                .catch(function (error) {
                    console.error('Error adding to cart:', error);
                    ShopifyCart.showNotification('Failed to add to cart', true);
                });
        },

        /**
         * Update item quantity in cart
         * @param {string} key - Cart line item key
         * @param {number} quantity - New quantity (0 to remove)
         */
        updateQuantity: function (key, quantity) {
            return fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: key,
                    quantity: quantity
                })
            })
                .then(function (response) {
                    if (!response.ok) throw new Error('Update failed');
                    return response.json();
                })
                .then(function (cart) {
                    ShopifyCart.updateCartUI(cart);
                    if (document.querySelector('.cart')) {
                        location.reload();
                    }
                    return cart;
                })
                .catch(function (error) {
                    console.error('Error updating cart:', error);
                });
        },

        /**
         * Get current cart state
         */
        getCart: function () {
            return fetch('/cart.js', {
                headers: { 'Content-Type': 'application/json' }
            })
                .then(function (response) { return response.json(); });
        },

        /**
         * Update all cart-related UI elements
         */
        updateCartUI: function (cart) {
            function update(cartData) {
                // Update cart count badges
                var badges = document.querySelectorAll('.cart-count-badge');
                badges.forEach(function (badge) {
                    if (cartData.item_count > 0) {
                        badge.textContent = cartData.item_count;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                });

                // Update navbar dot
                var dots = document.querySelectorAll('.navbar-search-icon .dot');
                dots.forEach(function (dot) {
                    dot.style.display = cartData.item_count > 0 ? 'block' : 'none';
                });

                // Update floating cart
                var floatingContainer = document.querySelector('.floating-cart-container');
                if (floatingContainer) {
                    if (cartData.item_count > 0) {
                        floatingContainer.classList.remove('is-hidden');
                        var itemsText = floatingContainer.querySelector('.floating-cart-items');
                        var totalText = floatingContainer.querySelector('.floating-cart-total');
                        if (itemsText) {
                            itemsText.textContent = cartData.item_count + ' ITEM' + (cartData.item_count > 1 ? 'S' : '');
                        }
                        if (totalText) {
                            totalText.textContent = Shopify.formatMoney(cartData.total_price);
                        }
                    } else {
                        floatingContainer.classList.add('is-hidden');
                    }
                }
            }

            if (cart) {
                update(cart);
            } else {
                ShopifyCart.getCart().then(update);
            }
        },

        /**
         * Show cart notification toast
         */
        showNotification: function (message, isError) {
            // Remove any existing notification
            var existing = document.querySelector('.cart-notification');
            if (existing) existing.remove();

            var notification = document.createElement('div');
            notification.className = 'cart-notification' + (isError ? ' error' : '');
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(function () {
                notification.remove();
            }, 2500);
        }
    };

    // Expose globally
    window.ShopifyCart = ShopifyCart;

    /* ============================================
       ADD TO CART BUTTONS
       ============================================ */
    function initAddToCartButtons() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-add-to-cart]');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            var variantId = btn.getAttribute('data-variant-id');
            if (!variantId) return;

            btn.disabled = true;
            btn.textContent = '...';

            ShopifyCart.addToCart(parseInt(variantId), 1).then(function () {
                btn.disabled = false;
                btn.textContent = '+';
            }).catch(function () {
                btn.disabled = false;
                btn.textContent = '+';
            });
        });

        // Product page form submit
        document.addEventListener('submit', function (e) {
            var form = e.target.closest('form[data-ajax-cart]');
            if (!form) return;

            e.preventDefault();
            var variantId = form.querySelector('[name="id"]').value;
            var quantity = parseInt(form.querySelector('[name="quantity"]')?.value) || 1;
            var submitBtn = form.querySelector('[type="submit"]');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Adding...';
            }

            ShopifyCart.addToCart(parseInt(variantId), quantity).then(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Added ✓';
                    setTimeout(function () {
                        submitBtn.textContent = 'Add to Cart';
                    }, 2000);
                }
            });
        });
    }

    /* ============================================
       CART PAGE QUANTITY BUTTONS
       ============================================ */
    function initCartQuantityButtons() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-cart-qty]');
            if (!btn) return;

            e.preventDefault();
            var key = btn.getAttribute('data-line-key');
            var action = btn.getAttribute('data-cart-qty');
            var currentQty = parseInt(btn.getAttribute('data-current-qty')) || 1;

            var newQty = action === 'plus' ? currentQty + 1 : currentQty - 1;
            if (newQty < 0) newQty = 0;

            ShopifyCart.updateQuantity(key, newQty);
        });

        // Remove item
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-cart-remove]');
            if (!btn) return;

            e.preventDefault();
            var key = btn.getAttribute('data-line-key');
            ShopifyCart.updateQuantity(key, 0);
        });
    }

    /* ============================================
       PREDICTIVE SEARCH
       ============================================ */
    function initPredictiveSearch() {
        var searchIcon = document.getElementById('search-icon');
        var searchContainer = document.querySelector('.search-input-container');
        var searchInput = document.querySelector('.search-input');
        var searchResults = document.querySelector('.search-results');

        if (!searchIcon || !searchContainer) return;

        var isOpen = false;

        searchIcon.addEventListener('click', function () {
            isOpen = !isOpen;
            searchContainer.style.display = isOpen ? 'block' : 'none';
            if (isOpen && searchInput) {
                searchInput.focus();
            } else if (searchResults) {
                searchResults.innerHTML = '';
            }
        });

        if (searchInput) {
            var debounceTimer = null;
            searchInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                var query = searchInput.value.trim();

                if (query.length < 2) {
                    if (searchResults) searchResults.innerHTML = '';
                    return;
                }

                debounceTimer = setTimeout(function () {
                    fetch('/search/suggest.json?q=' + encodeURIComponent(query) + '&resources[type]=product&resources[limit]=5')
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            if (!searchResults) return;
                            var products = data.resources.results.products || [];
                            if (products.length === 0) {
                                searchResults.innerHTML = '<div class="no-results">No items found</div>';
                                return;
                            }

                            searchResults.innerHTML = products.map(function (product) {
                                return '<a href="' + product.url + '" class="search-result-item">' +
                                    '<img src="' + product.featured_image.url + '" alt="' + product.title + '">' +
                                    '<div class="search-result-info">' +
                                    '<h4>' + product.title + '</h4>' +
                                    '<p>' + Shopify.formatMoney(product.price) + '</p>' +
                                    '</div></a>';
                            }).join('');
                        })
                        .catch(function () {
                            if (searchResults) searchResults.innerHTML = '<div class="no-results">Search error</div>';
                        });
                }, 300);
            });

            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    var query = searchInput.value.trim();
                    if (query) {
                        window.location.href = '/search?q=' + encodeURIComponent(query);
                    }
                }
            });
        }

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (!searchIcon.contains(e.target) &&
                !searchContainer.contains(e.target)) {
                searchContainer.style.display = 'none';
                isOpen = false;
            }
        });
    }

    /* ============================================
       INITIALIZE ON DOM READY
       ============================================ */
    document.addEventListener('DOMContentLoaded', function () {
        initMobileMenu();
        initCarousel();
        initAddToCartButtons();
        initCartQuantityButtons();
        initPredictiveSearch();

        // Initial cart UI update
        if (window.ShopifyCart) {
            ShopifyCart.updateCartUI();
        }
    });

})();
