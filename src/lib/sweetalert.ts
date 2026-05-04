import Swal from 'sweetalert2';

/**
 * Custom SweetAlert2 professional dark mode theme
 */
export const AppSwal = Swal.mixin({
    customClass: {
        popup: 'swal-popup-dark',
        title: 'swal-title-dark',
        htmlContainer: 'swal-text-dark',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn',
    },
    background: '#0a0a0a',
    color: '#ffffff',
    buttonsStyling: false,
    showClass: {
        popup: 'animate__animated animate__fadeInDown animate__faster'
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOutUp animate__faster'
    }
});

// CSS needs to be added to index.css or a global style file to support the customClasses
// I will add the CSS to src/app/globals.css or similar if it exists.
