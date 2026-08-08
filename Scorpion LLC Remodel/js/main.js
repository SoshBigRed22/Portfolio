document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Form Submission Handling ---
    const estimateForms = document.querySelectorAll('.estimate-form');

    estimateForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevents page reload

            const name = form.querySelector('input[type="text"]').value;
            
            // Temporary feedback for testing (Replace with backend API or Formspree/EmailJS later)
            alert(`Thank you, ${name}! Your estimate request has been submitted. We will call you back shortly.`);
            
            form.reset();
        });
    });

    // --- 2. Smooth Scroll for Internal Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

});