document.addEventListener('DOMContentLoaded', function() {
    const $carousels = document.querySelectorAll('.carousel');
    const carousel = M.Carousel.init($carousels, {
        fullWidth: true,
        indicators: true
    });
});
