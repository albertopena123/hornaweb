/***************************************************
==================== JS INDEX ======================
****************************************************

01. Mobile Nav Menu Dropdown Js
02. Scroll Back to Top Js
03. add active class to navbar menu current page Js
04. Settings Panel Js
05. Toast Notification Js
06. Form Submit Js
07. Password Show Hide Js
08. WOW Js
09. AOS Js
10. Preloader Js
11. Header Sticky Js
12. Magnific Popup Js
13. dd Attribute For Bg Image Js
14. Mouse active Js
15. counter Js
16. Solution Images Hover Animation Js
17. Countdown Js
18. Floating Progress Js


****************************************************/

(function ($) {
    "use strict";

    $(document).ready(function () {


        ////////////////////////////////////////////////////
        // 01. Mobile Nav Menu Dropdown Js
        function toggleSubMenu() {
            if ($(window).width() <= 991) {
                $(".has-submenu")
                    .off("click")
                    .on("click", function () {
                        $(this)
                            .toggleClass("active")
                            .siblings(".has-submenu")
                            .removeClass("active")
                            .find(".nav-submenu")
                            .slideUp(300);
                        $(this).find(".nav-submenu").stop(true, true).slideToggle(300);
                    });
            } else {
                $(".has-submenu").off("click");
            }
        }

        toggleSubMenu();
        $(window).resize(toggleSubMenu);




        ////////////////////////////////////////////////////
        // 02. Scroll Back to Top Js
        var progressPath = document.querySelector(".progress-wrap path");
        if (progressPath) {
            var pathLength = progressPath.getTotalLength();
            progressPath.style.transition = progressPath.style.WebkitTransition =
                "none";
            progressPath.style.strokeDasharray = pathLength + " " + pathLength;
            progressPath.style.strokeDashoffset = pathLength;
            progressPath.getBoundingClientRect();
            progressPath.style.transition = progressPath.style.WebkitTransition =
                "stroke-dashoffset 10ms linear";
            var updateProgress = function () {
                var scroll = $(window).scrollTop();
                var height = $(document).height() - $(window).height();
                var progress = pathLength - (scroll * pathLength) / height;
                progressPath.style.strokeDashoffset = progress;
            };
            updateProgress();
            $(window).scroll(updateProgress);
        }
        var offset = 50;
        var duration = 550;
        jQuery(window).on("scroll", function () {
            if (jQuery(this).scrollTop() > offset) {
                jQuery(".progress-wrap").addClass("active-progress");
            } else {
                jQuery(".progress-wrap").removeClass("active-progress");
            }
        });
        jQuery(".progress-wrap").on("click", function (event) {
            event.preventDefault();
            jQuery("html, body").animate({
                scrollTop: 0
            }, duration);
            return false;
        });





        ////////////////////////////////////////////////////
        // 03. add active class to navbar menu current page Js
        function dynamicActiveMenuClass(selector) {
            let FileName = window.location.pathname.split("/").reverse()[0];
            // If we are at the root path ("/" or no file name), keep the activePage class on the Home item
            if (FileName === "" || FileName === "index.html") {
                // Keep the activePage class on the Home link
                selector
                    .find("li.nav-menu__item.has-submenu")
                    .eq(0)
                    .addClass("activePage");
            } else {
                // Remove activePage class from all items first
                selector.find("li").removeClass("activePage");
                // Add activePage class to the correct li based on the current URL
                selector.find("li").each(function () {
                    let anchor = $(this).find("a");
                    if ($(anchor).attr("href") == FileName) {
                        $(this).addClass("activePage");
                    }
                });
                // If any li has activePage element, add class to its parent li
                selector.children("li").each(function () {
                    if ($(this).find(".activePage").length) {
                        $(this).addClass("activePage");
                    }
                });
            }
        }
        if ($("ul").length) {
            dynamicActiveMenuClass($("ul"));
        }




        ////////////////////////////////////////////////////
        // 04. Settings Panel Js
        $(".settings-button").on("click", function () {
            $(".settings-panel").toggleClass("active");
            $(this).toggleClass("active");
        });
        $(document).on(
            "click",
            ".settings-panel__buttons .settings-panel__button",
            function () {
                $(this).siblings().removeClass("active");
                $(this).addClass("active");
            }
        );
        // Cursor start
        $(".cursor-animate").on("click", function () {
            $("body").removeClass("remove-animate-cursor");
        });
        $(".cursor-default").on("click", function () {
            $("body").addClass("remove-animate-cursor");
        });
        // Cursor end
        // Direction start
        $(".direction-ltr").on("click", function () {
            $("html").attr("dir", "ltr");
        });
        $(".direction-rtl").on("click", function () {
            $("html").attr("dir", "rtl");
        });






        ////////////////////////////////////////////////////
        // 05. Toast Notification Js
        function toastMessage(messageType, messageTitle, messageText, messageIcon) {
            let $toastContainer = $("#toast-container");
            let $toast = $("<div>", {
                class: `toast-message ${messageType}`,
                html: `
      <div class="toast-message__content">
        <span class="toast-message__icon">
          <i class="${messageIcon}"></i>
        </span>
        <div class="flex-grow-1">
          <div class="d-flex align-items-start justify-content-between mb-1">
            <h6 class="toast-message__title">${messageTitle}</h6>
            <button type="button" class="toast-message__close">
              <i class="ph-bold ph-x"></i>
            </button>
          </div>
          <span class="toast-message__text">${messageText}</span>
        </div>
      </div>
      <div class="progress__bar"></div>
    `,
            });

            $toastContainer.append($toast);
            setTimeout(() => {
                $toast.addClass("active");
            }, 50);
            let totalDuration = 3500;
            let startTime = Date.now();
            let remainingTime = totalDuration;
            let toastTimeout = setTimeout(hideToast, remainingTime);

            function hideToast() {
                $toast.removeClass("active");
                setTimeout(() => {
                    $toast.remove();
                }, 500);
            }
            // Remove Toast on Close Button Click
            $toast.find(".toast-message__close").on("click", function () {
                $toast.removeClass("active");
                setTimeout(() => {
                    $toast.remove();
                }, 500);
            });
            // Pause Timeout on Hover
            $toast.on("mouseenter", function () {
                remainingTime -= Date.now() - startTime;
                clearTimeout(toastTimeout);
            });
            // Resume Timeout on Mouse Leave
            $toast.on("mouseleave", function () {
                startTime = Date.now();
                toastTimeout = setTimeout(hideToast, remainingTime);
            });
        }




        ////////////////////////////////////////////////////
        // 06. Form Submit Js
        $(document).on("submit", ".form-submit", function (e) {
            e.preventDefault();
            $("input").val("");
            $("textarea").val("");
            toastMessage(
                "success",
                "Success",
                "Form submitted successfully!",
                "ph-fill ph-check-circle"
            );
        });


        ////////////////////////////////////////////////////
        // 07. Password Show Hide Js
        $(".toggle-password").on("click", function () {
            $(this).toggleClass("active");
            var input = $($(this).attr("id"));
            if (input.attr("type") == "password") {
                input.attr("type", "text");
                $(this).removeClass("ph-bold ph-eye-closed");
                $(this).addClass("ph-bold ph-eye");
            } else {
                input.attr("type", "password");
                $(this).addClass("ph-bold ph-eye-closed");
            }
        });


        ////////////////////////////////////////////////////
        //  niceSelect Js
        $(document).ready(function() {
            $('select').not('.no-nice-select').niceSelect();
        });


        ////////////////////////////////////////////////////
        // 08. WOW Js
        new WOW().init();



        ////////////////////////////////////////////////////
        // 09. AOS Js
        AOS.init({
            once: false,
            offset: 0,
            anchorPlacement: "top-bottom",
        });


    });


    ////////////////////////////////////////////////////
    // 10. Preloader Js
    $(window).on("load", function () {
        $(".loader-mask").fadeOut();
    });



    ////////////////////////////////////////////////////
    // 11. Header Sticky Js
    $(window).on("scroll", function () {
        if ($(window).scrollTop() >= 260) {
            $(".header").addClass("fixed-header");
        } else {
            $(".header").removeClass("fixed-header");
        }
    });



    ////////////////////////////////////////////////////
    // 12. Magnific Popup Js
    $('.open-popup').magnificPopup({
        type: 'iframe',
        removalDelay: 300,
        mainClass: 'mfp-fade',
    });



    ////////////////////////////////////////////////////
    // 13. dd Attribute For Bg Image Js
    $(".bg-img").each(function () {
        var img = $(this).data("background-image");
        if (img) {
            $(this).css("background-image", "url('" + img + "')");
        }
    });



    ////////////////////////////////////////////////////
    // 14. Mouse active Js
    $(document).ready(function () {
        $(
            ".vision-wrapper, .vision-two-wrapper, .project-two-item, .vision-three-wrapper"
        ).on("mouseenter", function () {
            $(this).addClass("active").siblings().removeClass("active");
        });
        $(
            ".vision-wrapper, .vision-two-wrapper, .project-two-item, .vision-three-wrapper"
        ).on("mouseenter", function () {
            $(this).addClass("active");
            $(this)
                .parent()
                .siblings()
                .find(
                    ".vision-wrapper, .vision-two-wrapper, .project-two-item, .vision-three-wrapper"
                )
                .removeClass("active");
        });
    });



    ////////////////////////////////////////////////////
    // 15. counter Js
    new PureCounter();
    new PureCounter({
        filesizing: true,
        selector: ".filesizecount",
        pulse: 2,
    });




    ////////////////////////////////////////////////////
    // 16. Solution Images Hover Animation Js
    $('.solution-list-wrap .solution-list-item').on("mouseenter", function () {
        $('#solution-thumb').removeClass().addClass($(this).attr('rel'));
        $(this).addClass('active').siblings().removeClass('active');
    });



    ////////////////////////////////////////////////////
    // 17. Countdown Js
    (function () {
        const second = 1000,
            minute = second * 60,
            hour = minute * 60,
            day = hour * 24;
        document.querySelectorAll('.event-two-countdown').forEach(countdown => {
            const targetDate = new Date(countdown.dataset.date).getTime();
            const daysEl = countdown.querySelector('.days');
            const hoursEl = countdown.querySelector('.hours');
            const minutesEl = countdown.querySelector('.minutes');
            const secondsEl = countdown.querySelector('.seconds');
            const update = () => {
                const now = Date.now();
                const distance = targetDate - now;
                const time = Math.max(0, distance);
                daysEl.textContent = Math.floor(time / day);
                hoursEl.textContent = Math.floor((time % day) / hour);
                minutesEl.textContent = Math.floor((time % hour) / minute);
                secondsEl.textContent = Math.floor((time % minute) / second);
                if (distance <= 0) {
                    clearInterval(timer);
                }
            };
            update();
            const timer = setInterval(update, 1000);
        });
    })();




    ////////////////////////////////////////////////////
    // 18. Floating Progress Js
    const progressContainers = document.querySelectorAll('.progress-container');

    function setPercentage(progressContainer) {
        const percentage = progressContainer.getAttribute('data-percentage') + '%';
        const progressEl = progressContainer.querySelector('.progress');
        const percentageEl = progressContainer.querySelector('.percentage');
        progressEl.style.width = percentage;
        percentageEl.innerText = percentage;
        percentageEl.style.insetInlineStart = percentage;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progressContainer = entry.target;
                setPercentage(progressContainer);
                progressContainer.querySelector('.progress').classList.remove('active');
                progressContainer.querySelector('.percentage').classList.remove('active');
                observer.unobserve(progressContainer);
            }
        });
    }, {
        threshold: 0.5
    });
    progressContainers.forEach(progressContainer => {
        observer.observe(progressContainer);
    });





    ////////////////////////////////////////////////////
    // 19. Ecommerce Cart Js
	function tw_ecommerce() {
        $('.tw-cart-minus').on('click', function () {
			var $input = $(this).parent().find('input');
			var count = Number($input.val()) - 1;19
			count = count < 1 ? 1 : count;
			$input.val(count);
			$input.change();
			return false;
		});
		$('.tw-cart-plus').on('click', function () {
			var $input = $(this).parent().find('input');
			$input.val(Number($input.val()) + 1);
			$input.change();
			return false;
		});
		$("#slider-range").slider({
			range: true,
			min: 0,
			max: 500,
			values: [75, 300],
			slide: function (event, ui) {
				$("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
			}
		});
		$("#amount").val("$" + $("#slider-range").slider("values", 0) +
			" - $" + $("#slider-range").slider("values", 1));

        
		$('.checkout-payment-item label').on('click', function () {
			$(this).siblings('.checkout-payment-desc').slideToggle(400);
			
		});

		// Show Login Toggle Js
		$('.checkout-login-form-reveal-btn').on('click', function () {
			$('#ReturnCustomerLoginForm').slideToggle(400);
		});


		// 18. Show Coupon Toggle Js
		$('.checkout-coupon-form-reveal-btn').on('click', function () {
			$('#CheckoutCouponForm').slideToggle(400);
		});
	}
	tw_ecommerce();
    const box = document.querySelector('.cart-ip-wrapper');
    if (box) { 
        box.style.overflowX = 'auto';
        box.style.whiteSpace = 'nowrap';
    }


    ////////////////////////////////////////////////////
    // 20. Donation  Js
    var selector = '.single_amount_wrapper .single_amount';
    $(selector).on('click', function(){
        $(selector).removeClass('active');
        $(this).addClass('active');
    });
    $('.donation_wrapper > .single_amount_wrapper > .single_amount').on('click', function() {
        $('.donation_wrapper > .amount_wrapper > input')
            .val(parseFloat($(this).data('value')).toFixed(2))
            .trigger('change');
    });






})(jQuery);