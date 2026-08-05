/***************************************************
==================== JS INDEX ======================
****************************************************

01. Project Js
02. testimonial Js
03. event two Js
04. testimonial three Js
05. project description Js

****************************************************/


(function ($) {
    "use strict";


    ////////////////////////////////////////////////////
    // 01. Project Js
    var slider = new Swiper('.project-active', {
        slidesPerView: "auto",
        spaceBetween: 20,
        loop: true,
        breakpoints: {
            '1200': {
                slidesPerView: 3.8,
            },
            '992': {
                slidesPerView: 3,
            },
            '768': {
                slidesPerView: 2,
            },
            '576': {
                slidesPerView: 1,
            },
            '0': {
                slidesPerView: 1,
            },
        },
        // Navigation arrows
        navigation: {
            nextEl: '.slider-next',
            prevEl: '.slider-prev',
        },
    });




    ////////////////////////////////////////////////////
    // 02. testimonial Js
    var slider = new Swiper('.testimonial-active', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        // Navigation arrows
        navigation: {
            nextEl: '.slider-next',
            prevEl: '.slider-prev',
        },
    });





    ////////////////////////////////////////////////////
    // 03. event two Js
    var slider = new Swiper('.event-two-active', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        // Navigation arrows
        navigation: {
            nextEl: '.slider-next',
            prevEl: '.slider-prev',
        },
        pagination: {
            el: '#paginations',
            type: 'custom',
            renderCustom: function (swiper, current, total) {
                let html = `<div class="slider-pagination">
                        <span>${current}</span>
                        <span class="separator"> / </span>
                        <span>${total}</span>
                        </div>`;
                return html;
            }
        },
    });





    ////////////////////////////////////////////////////
    // 04. testimonial three Js
    var slider = new Swiper('.testimonial-three-active', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        // Navigation arrows
        navigation: {
            nextEl: '.slider-next',
            prevEl: '.slider-prev',
        },
        pagination: {
            el: '#paginations',
            type: 'custom',
            renderCustom: function (swiper, current, total) {
                let html = `<div class="slider-pagination">
						<span>${current}</span>
						<span class="separator"> / </span>
						<span>${total}</span>
						</div>`;
                return html;
            }
        },
    });



    ////////////////////////////////////////////////////
    // 05. project description Js
    var slider = new Swiper('.project-description-active', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        // Navigation arrows
        navigation: {
            nextEl: '.slider-next',
            prevEl: '.slider-prev',
        },
    });




	////////////////////////////////////////////////////
	// 12. Product Details Js
	var swiper = new Swiper(".mySwiper", {
      spaceBetween: 16,
      slidesPerView: 3,
      freeMode: true,
      watchSlidesProgress: true,
    });
    var swiper2 = new Swiper(".mySwiper2", {
      spaceBetween: 10,
      thumbs: {
        swiper: swiper,
      },
    });










})(jQuery);