document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
        const res = await fetch("/api/admin/profile", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (res.ok) {
            const admin = await res.json();

            // 1. Update Sidebar Avatar
            const avatars = document.querySelectorAll(".admin-avatar");
            avatars.forEach(img => {
                if (admin.avatar) img.src = admin.avatar;
            });

            // 2. Update Sidebar Name & Email
            const names = document.querySelectorAll(".admin-name");
            names.forEach(el => el.textContent = admin.fullName || "Admin");

            const emails = document.querySelectorAll(".admin-email");
            emails.forEach(el => el.textContent = admin.email || "");

            // 3. Update Top Bar Avatar (if exists)
            // Strategy: Look for the small circle image in .top-bar or .d-flex
            const topBarImg = document.querySelector(".top-bar img.rounded-circle") ||
                document.querySelector("header img.rounded-circle");
            if (topBarImg && admin.avatar) {
                topBarImg.src = admin.avatar;
            }
            // 4. Handle Logout
            const logoutBtn = document.querySelector(".bi-box-arrow-right");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => {
                    Swal.fire({
                        title: 'Are you sure?',
                        text: "You will be logged out of the admin panel.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#6C8EEF',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, Logout'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            localStorage.removeItem("adminToken");
                            localStorage.removeItem("adminRole");
                            // Redirect to root login
                            window.location.href = "/login.html";
                        }
                    });
                });
            }
        }
    } catch (err) {
        console.error("Failed to load global admin profile", err);
    }
});
