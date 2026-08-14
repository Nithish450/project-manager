import Swal from "sweetalert2";

// Configure default themed Swal settings using a mixin
const premiumSwal = Swal.mixin({
    customClass: {
        popup: "custom-swal-popup",
        title: "custom-swal-title",
        htmlContainer: "custom-swal-text",
        actions: "custom-swal-actions",
        confirmButton: "custom-swal-confirm-btn",
        cancelButton: "custom-swal-cancel-btn",
    },
    buttonsStyling: false, // Disables default SweetAlert2 button styles so our CSS classes take effect
    background: "var(--bg-card, #ffffff)",
    color: "var(--text-main, #0f172a)",
});

// Toast notification helper
const premiumToast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "var(--bg-card, #ffffff)",
    color: "var(--text-main, #0f172a)",
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

/**
 * Show a success alert modal
 */
export const showSuccess = (title, text = "") => {
    return premiumSwal.fire({
        icon: "success",
        title,
        text,
    });
};

/**
 * Show an error alert modal
 */
export const showError = (title, text = "") => {
    return premiumSwal.fire({
        icon: "error",
        title,
        text: text || "Something went wrong. Please try again.",
    });
};

/**
 * Show a warning alert modal
 */
export const showWarning = (title, text = "") => {
    return premiumSwal.fire({
        icon: "warning",
        title,
        text,
    });
};

/**
 * Show an info alert modal
 */
export const showInfo = (title, text = "") => {
    return premiumSwal.fire({
        icon: "info",
        title,
        text,
    });
};

/**
 * Show a confirmation modal (returns true/false)
 */
export const showConfirm = async (title, text = "This action cannot be undone.", confirmButtonText = "Confirm") => {
    const result = await premiumSwal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: "Cancel",
        reverseButtons: true,
    });
    return result.isConfirmed;
};

/**
 * Show a small toast notification on the top right
 */
export const showToast = (title, icon = "success") => {
    premiumToast.fire({
        icon,
        title,
    });
};

export default {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showToast,
};
