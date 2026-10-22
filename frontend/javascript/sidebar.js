document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.nav-item-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const parentGroup = button.parentElement;
            
            parentGroup.classList.toggle('active');
        });
    });
});