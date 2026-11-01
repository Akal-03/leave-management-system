// ======================================================
// GLOBAL VARIABLES
// ======================================================

let token =
    localStorage.getItem("leaveToken");


// ======================================================
// ELEMENTS
// ======================================================

const loginSection =
    document.getElementById("loginSection");

const registerSection =
    document.getElementById("registerSection");

const studentDashboard =
    document.getElementById("studentDashboard");

const authorityDashboard =
    document.getElementById("authorityDashboard");

const logoutBtn =
    document.getElementById("logoutBtn");


// ======================================================
// SHOW SECTION
// ======================================================

function showSection(section) {

    loginSection.classList.add("hidden");

    registerSection.classList.add("hidden");

    studentDashboard.classList.add("hidden");

    authorityDashboard.classList.add("hidden");


    section.classList.remove("hidden");
}


// ======================================================
// API FUNCTION
// ======================================================

async function api(
    url,
    options = {}
) {

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Something went wrong"
        );
    }


    return data;
}


// ======================================================
// SHOW MESSAGE
// ======================================================

function showMessage(
    element,
    message,
    success = false
) {

    element.textContent = message;

    element.style.color =
        success
            ? "green"
            : "red";
}


// ======================================================
// LOGIN
// ======================================================

document
    .getElementById("loginForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value;


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            const message =
                document.getElementById(
                    "loginMessage"
                );


            try {

                const data =
                    await api(
                        "/api/login",
                        {
                            method: "POST",

                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );


                token = data.token;


                localStorage.setItem(
                    "leaveToken",
                    token
                );


                logoutBtn.classList.remove(
                    "hidden"
                );


                if (
                    data.user.role ===
                    "authority"
                ) {

                    showSection(
                        authorityDashboard
                    );

                    await loadAuthorityLeaves();

                } else {

                    showSection(
                        studentDashboard
                    );

                    await loadStudentDashboard();
                }


                message.textContent = "";


            } catch (error) {

                showMessage(
                    message,
                    error.message
                );
            }
        }
    );


// ======================================================
// SHOW REGISTER
// ======================================================

document
    .getElementById(
        "showRegisterBtn"
    )
    .addEventListener(
        "click",
        function () {

            showSection(
                registerSection
            );
        }
    );


// ======================================================
// SHOW LOGIN
// ======================================================

document
    .getElementById(
        "showLoginBtn"
    )
    .addEventListener(
        "click",
        function () {

            showSection(
                loginSection
            );
        }
    );


// ======================================================
// REGISTER
// ======================================================

document
    .getElementById("registerForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document.getElementById(
                    "registerName"
                ).value;


            const rollNumber =
                document.getElementById(
                    "registerRoll"
                ).value;


            const email =
                document.getElementById(
                    "registerEmail"
                ).value;


            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


            const message =
                document.getElementById(
                    "registerMessage"
                );


            try {

                await api(
                    "/api/register",
                    {
                        method: "POST",

                        body: JSON.stringify({

                            username,

                            rollNumber,

                            email,

                            password

                        })
                    }
                );


                showMessage(
                    message,
                    "Registration successful. Please login.",
                    true
                );


                document
                    .getElementById(
                        "registerForm"
                    )
                    .reset();


            } catch (error) {

                showMessage(
                    message,
                    error.message
                );
            }
        }
    );


// ======================================================
// LOAD STUDENT DASHBOARD
// ======================================================

async function loadStudentDashboard() {

    try {

        const userData =
            await api(
                "/api/me"
            );


        const balance =
            await api(
                "/api/leave-balance"
            );


        document
            .getElementById(
                "studentWelcome"
            )
            .textContent =
                `Welcome, ${userData.user.username} (${userData.user.rollNumber})`;


        document
            .getElementById(
                "casualBalance"
            )
            .textContent =
                balance.casualLeave;


        document
            .getElementById(
                "medicalBalance"
            )
            .textContent =
                balance.medicalLeave;


        await loadStudentLeaves();


    } catch (error) {

        console.error(error);
    }
}


// ======================================================
// APPLY LEAVE
// ======================================================

document
    .getElementById("leaveForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const leaveType =
                document.getElementById(
                    "leaveType"
                ).value;


            const fromDate =
                document.getElementById(
                    "fromDate"
                ).value;


            const toDate =
                document.getElementById(
                    "toDate"
                ).value;


            const reason =
                document.getElementById(
                    "reason"
                ).value;


            const message =
                document.getElementById(
                    "leaveMessage"
                );


            try {

                await api(
                    "/api/apply-leave",
                    {
                        method: "POST",

                        body: JSON.stringify({

                            leaveType,

                            fromDate,

                            toDate,

                            reason

                        })
                    }
                );


                showMessage(
                    message,
                    "Leave request submitted successfully.",
                    true
                );


                document
                    .getElementById(
                        "leaveForm"
                    )
                    .reset();


                await loadStudentDashboard();


            } catch (error) {

                showMessage(
                    message,
                    error.message
                );
            }
        }
    );


// ======================================================
// LOAD STUDENT LEAVES
// ======================================================

async function loadStudentLeaves() {

    try {

        const data =
            await api(
                "/api/my-leaves"
            );


        const table =
            document.getElementById(
                "studentLeaveTable"
            );


        table.innerHTML = "";


        if (data.leaves.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No leave requests found
                    </td>
                </tr>
            `;

            return;
        }


        data.leaves.forEach(
            function (leave) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${leave.leaveType}
                    </td>

                    <td>
                        ${formatDate(
                            leave.fromDate
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            leave.toDate
                        )}
                    </td>

                    <td>
                        ${leave.days}
                    </td>

                    <td>
                        ${escapeHTML(
                            leave.reason
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            leave.status
                        )}
                    </td>

                    <td>
                        ${
                            escapeHTML(
                                leave.authorityRemarks ||
                                "-"
                            )
                        }
                    </td>

                `;


                table.appendChild(row);

            }
        );


    } catch (error) {

        console.error(error);
    }
}


// ======================================================
// LOAD AUTHORITY LEAVES
// ======================================================

async function loadAuthorityLeaves() {

    try {

        const data =
            await api(
                "/api/authority/leaves"
            );


        const leaves =
            data.leaves;


        document
            .getElementById(
                "totalRequests"
            )
            .textContent =
                leaves.length;


        document
            .getElementById(
                "pendingRequests"
            )
            .textContent =
                leaves.filter(
                    leave =>
                        leave.status ===
                        "Pending"
                ).length;


        document
            .getElementById(
                "approvedRequests"
            )
            .textContent =
                leaves.filter(
                    leave =>
                        leave.status ===
                        "Approved"
                ).length;


        document
            .getElementById(
                "rejectedRequests"
            )
            .textContent =
                leaves.filter(
                    leave =>
                        leave.status ===
                        "Rejected"
                ).length;


        const table =
            document.getElementById(
                "authorityLeaveTable"
            );


        table.innerHTML = "";


        if (leaves.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="9">
                        No leave requests found
                    </td>
                </tr>
            `;

            return;
        }


        leaves.forEach(
            function (leave) {

                const row =
                    document.createElement(
                        "tr"
                    );


                let action = "-";


                if (
                    leave.status ===
                    "Pending"
                ) {

                    action = `

                        <button
                            class="approve-btn"
                            onclick="updateLeave(
                                '${leave._id}',
                                'Approved'
                            )"
                        >
                            Approve
                        </button>


                        <button
                            class="reject-btn"
                            onclick="updateLeave(
                                '${leave._id}',
                                'Rejected'
                            )"
                        >
                            Reject
                        </button>

                    `;
                }


                row.innerHTML = `

                    <td>
                        ${
                            escapeHTML(
                                leave.student?.username ||
                                "-"
                            )
                        }
                    </td>


                    <td>
                        ${
                            escapeHTML(
                                leave.student?.rollNumber ||
                                "-"
                            )
                        }
                    </td>


                    <td>
                        ${leave.leaveType}
                    </td>


                    <td>
                        ${formatDate(
                            leave.fromDate
                        )}
                    </td>


                    <td>
                        ${formatDate(
                            leave.toDate
                        )}
                    </td>


                    <td>
                        ${leave.days}
                    </td>


                    <td>
                        ${
                            escapeHTML(
                                leave.reason
                            )
                        }
                    </td>


                    <td>
                        ${statusBadge(
                            leave.status
                        )}
                    </td>


                    <td>
                        ${action}
                    </td>

                `;


                table.appendChild(row);

            }
        );


    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}


// ======================================================
// APPROVE / REJECT LEAVE
// ======================================================

async function updateLeave(
    leaveId,
    status
) {

    let remarks = "";


    if (status === "Rejected") {

        remarks =
            prompt(
                "Enter rejection reason:"
            );


        if (!remarks) {

            alert(
                "Rejection reason is required"
            );

            return;
        }
    }


    if (status === "Approved") {

        const confirmApprove =
            confirm(
                "Approve this leave request?"
            );


        if (!confirmApprove) {

            return;
        }
    }


    try {

        await api(
            `/api/authority/leaves/${leaveId}`,
            {
                method: "PATCH",

                body: JSON.stringify({

                    status,

                    authorityRemarks:
                        remarks

                })
            }
        );


        await loadAuthorityLeaves();


    } catch (error) {

        alert(
            error.message
        );
    }
}


// ======================================================
// REFRESH STAFF DASHBOARD
// ======================================================

document
    .getElementById("refreshBtn")
    .addEventListener(
        "click",
        function () {

            loadAuthorityLeaves();

        }
    );


// ======================================================
// LOGOUT
// ======================================================

logoutBtn.addEventListener(
    "click",
    function () {

        localStorage.removeItem(
            "leaveToken"
        );

        token = null;


        logoutBtn.classList.add(
            "hidden"
        );


        showSection(
            loginSection
        );


        document
            .getElementById(
                "loginForm"
            )
            .reset();

    }
);


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(date) {

    if (!date) {
        return "-";
    }


    return new Date(date)
        .toLocaleDateString(
            "en-IN"
        );
}


// ======================================================
// STATUS BADGE
// ======================================================

function statusBadge(status) {

    let className =
        "status-pending";


    if (status === "Approved") {

        className =
            "status-approved";

    } else if (
        status === "Rejected"
    ) {

        className =
            "status-rejected";
    }


    return `
        <span class="status ${className}">
            ${status}
        </span>
    `;
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================================
// RESTORE LOGIN
// ======================================================

async function restoreSession() {

    if (!token) {

        showSection(
            loginSection
        );

        return;
    }


    try {

        const data =
            await api(
                "/api/me"
            );


        logoutBtn.classList.remove(
            "hidden"
        );


        if (
            data.user.role ===
            "authority"
        ) {

            showSection(
                authorityDashboard
            );

            await loadAuthorityLeaves();

        } else {

            showSection(
                studentDashboard
            );

            await loadStudentDashboard();
        }


    } catch (error) {

        localStorage.removeItem(
            "leaveToken"
        );

        token = null;


        showSection(
            loginSection
        );
    }
}


// ======================================================
// START APPLICATION
// ======================================================

restoreSession();