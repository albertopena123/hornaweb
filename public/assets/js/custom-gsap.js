/***************************************************
==================== JS INDEX ======================
****************************************************
01. Smooth Scroll Js
02. Mobile Menul Js
03. Section title Js
04. button custom hover animation Js
05. big button custom hover animation Js
06. project scroll Js
07. mission two sticky Js
08. mission four sticky Js
****************************************************/




var tl = gsap.timeline();
gsap.registerPlugin(ScrollTrigger, SplitText);
////////////////////////////////////////////////////
// 01. Smooth Scroll Js
function smoothSctoll() {
    $('.smooth a').on('click', function (event) {
        var target = $(this.getAttribute('href'));
        if (target.length) {
            event.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 120
            }, 1500);
        }
    });
}
smoothSctoll();
if ($('#smooth-wrapper').length && $('#smooth-content').length) {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother, TweenMax, ScrollToPlugin);

    gsap.config({
        nullTargetWarn: false,
    });

    let smoother = ScrollSmoother.create({
        smooth: 2,
        effects: true,
        smoothTouch: 0.1,
        normalizeScroll: false,
        ignoreMobileResize: true,
    });
}



////////////////////////////////////////////////////
// 02. Mobile Menul Js
var mmm = gsap.matchMedia();
var mtl = gsap.timeline({
    paused: true
});
const toggleMobileMenu = document.querySelector(".toggle-mobileMenu");
const closeButton = document.querySelector(".close-button");
const mobileSideOverlay = document.querySelector(".side-overlay");

mmm.add("(max-width: 991px)", () => {
    mtl.to(".side-overlay", {
        opacity: 1,
        visibility: "visible",
        duration: 0.15,
    });

    mtl.to(".mobile-menu", {
        x: 0,
        delay: 0.2,
        duration: 0.2,
    });

    mtl.from(".nav-menu__item", {
        opacity: 0,
        duration: 0.2,
        y: -60,
        stagger: 0.08,
    });

    toggleMobileMenu.addEventListener("click", function () {
        mtl.play();
        document.body.style.overflow = "hidden";
    });

    closeButton.addEventListener("click", function () {
        mtl.reverse();
        document.body.style.overflow = "";
    });

    mobileSideOverlay.addEventListener("click", function () {
        mtl.reverse();
        document.body.style.overflow = "";
    });
});






////////////////////////////////////////////////////
// 03. Section title Js
if ($(window).width() > 768 && $(".tw-char-animation").length > 0) {
    let char_come = gsap.utils.toArray(".tw-char-animation");
    char_come.forEach(splitTextLine => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: splitTextLine,
                start: "top 90%",
                end: "bottom 60%",
                scrub: false,
                markers: false,
                toggleActions: "play none none none",
            },
        });
        const itemSplitted = new SplitText(splitTextLine, {
            type: "chars, words",
        });
        gsap.set(splitTextLine, {
            perspective: 300
        });
        itemSplitted.split({
            type: "chars, words"
        });
        tl.from(itemSplitted.chars, {
            duration: 1,
            delay: 0.5,
            x: 100,
            autoAlpha: 0,
            stagger: 0.05,
        });
    });
}




////////////////////////////////////////////////////
// 04. button custom hover animation Js
$(".tw-hover-btn").on("mouseenter", function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;
    $(this).find(".tw-hover-btn-circle-dot").css({
        top: y,
        left: x,
    });
});
$(".tw-hover-btn").on("mouseout", function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;
    $(this).find(".tw-hover-btn-circle-dot").css({
        top: y,
        left: x,
    });
});



////////////////////////////////////////////////////
// 5. big button custom hover animation Js
$('.tw-hover-btn').on('mouseenter', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;
    $(this).find('.tw-btn-circle-dot').css({
        top: y,
        left: x
    });
});
$('.tw-hover-btn').on('mouseout', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;
    $(this).find('.tw-btn-circle-dot').css({
        top: y,
        left: x
    });
});
var hoverBtns = gsap.utils.toArray(".tw-hover-btn-wrapper");
const hoverBtnItem = gsap.utils.toArray(".tw-hover-btn-item");
hoverBtns.forEach((btn, i) => {
    $(btn).mousemove(function (e) {
        callParallax(e);
    });

    function callParallax(e) {
        parallaxIt(e, hoverBtnItem[i], 60);
    }

    function parallaxIt(e, target, movement) {
        var $this = $(btn);
        var relX = e.pageX - $this.offset().left;
        var relY = e.pageY - $this.offset().top;
        gsap.to(target, 1, {
            x: ((relX - $this.width() / 2) / $this.width()) * movement,
            y: ((relY - $this.height() / 2) / $this.height()) * movement,
            ease: Power2.easeOut,
        });
    }
    $(btn).mouseleave(function (e) {
        gsap.to(hoverBtnItem[i], 1, {
            x: 0,
            y: 0,
            ease: Power2.easeOut,
        });
    });
});



////////////////////////////////////////////////////
// 06. project scroll Js
let pr = gsap.matchMedia();
pr.add("(min-width: 1199px)", () => {
    let tl = gsap.timeline();
    let projectpanels = document.querySelectorAll('.project-panel')
    projectpanels.forEach((section, index) => {
        tl.to(section, {
            scrollTrigger: {
                trigger: section,
                pin: section,
                scrub: 1,
                start: 'center center',
                end: "bottom 60%",
                endTrigger: '.project-panel-area',
                pinSpacing: false,
                markers: false,
            },
        })
    })
});


////////////////////////////////////////////////////
// 07. mission two sticky Js
gsap.utils.toArray('.mission-two-sticky').forEach(sticky => {
    if (window.innerWidth < 0 || window.innerWidth > 992) {
        ScrollTrigger.create({
            trigger: sticky,
            start: 'top top+=278',
            end: '+=1290',
            pin: true,
            scrub: true,
        });
    }
});


////////////////////////////////////////////////////
// 08. mission four sticky Js
gsap.utils.toArray('.mission-four-sticky').forEach(sticky => {
    if (window.innerWidth < 0 || window.innerWidth > 992) {
        ScrollTrigger.create({
            trigger: sticky,
            start: 'top top+=278',
            end: '+=1490',
            pin: true,
            scrub: true,
        });
    }
});


/* **************************************************************************** 
                          Custom GSAP js start 
****************************************************************************  */