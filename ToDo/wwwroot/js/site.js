// Глобальные переменные
let authToken = localStorage.getItem("authToken")
let currentUser = localStorage.getItem("currentUser")
let todos = []
let categories = []
const bootstrap = window.bootstrap 

// Статусы
const TodoStatus = {
    NotStarted: 0,
    InProgress: 1,
    Completed: 2,
}

const StatusNames = {
    0: "Не выполнено",
    1: "В процессе",
    2: "Выполнено",
}

const StatusClasses = {
    0: "text-danger",
    1: "text-warning",
    2: "text-success",
}

const StatusIcons = {
    0: "fas fa-circle",
    1: "fas fa-clock",
    2: "fas fa-check-circle",
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, checking auth...")

    if (authToken && currentUser) {
        console.log("User is authenticated:", currentUser)
        showApp()
    } else {
        console.log("User is not authenticated")
        showLogin()
    }

    setupEventListeners()
})

// Настройка обработчиков событий
function setupEventListeners() {
    // Формы аутентификации
    document.getElementById("loginForm").addEventListener("submit", handleLogin)
    document.getElementById("registerForm").addEventListener("submit", handleRegister)

    // Формы создания
    document.getElementById("categoryForm").addEventListener("submit", handleCreateCategory)
    document.getElementById("todoForm").addEventListener("submit", handleCreateTodo)

    // Фильтры
    document.getElementById("filterCategory").addEventListener("change", applyFilters)
    document.getElementById("filterStatus").addEventListener("change", applyFilters)
}

// Показать экран входа
function showLogin() {
    document.getElementById("loginScreen").style.display = "block"
    document.getElementById("appScreen").style.display = "none"
}

// Показать основное приложение
function showApp() {
    document.getElementById("loginScreen").style.display = "none"
    document.getElementById("appScreen").style.display = "block"
    document.getElementById("userInfo").textContent = `Добро пожаловать, ${currentUser}!`

    loadCategories()
    loadTodos()
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault()

    const username = document.getElementById("loginUsername").value
    const password = document.getElementById("loginPassword").value
    
    // Отправляет POST-запрос на /api/Auth/login, сохраняет токен и имя пользователя в localStorage, показывает приложение
    try {
        const response = await fetch("/api/Auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (response.ok) {
            authToken = data.token
            currentUser = username
            localStorage.setItem("authToken", authToken)
            localStorage.setItem("currentUser", currentUser)

            showNotification("Вход выполнен успешно!", "success")
            showApp()
        } else {
            showNotification(data.message || "Ошибка входа", "error")
        }
    } catch (error) {
        console.error("Login error:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault()

    const username = document.getElementById("registerUsername").value
    const email = document.getElementById("registerEmail").value
    const password = document.getElementById("registerPassword").value

    // Отправляет POST-запрос на /api/Auth/register, при успехе переключает на вкладку входа
    try {
        const response = await fetch("/api/Auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
        })

        const data = await response.json()

        if (response.ok) {
            showNotification("Регистрация успешна! Теперь войдите в систему.", "success")
            // Переключаемся на вкладку входа
            document.getElementById("login-tab").click()
            // Очищаем форму регистрации
            document.getElementById("registerForm").reset()
        } else {
            showNotification(data.message || "Ошибка регистрации", "error")
        }
    } catch (error) {
        console.error("Register error:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Выход из системы
// Очищает localStorage и возвращает на экран входа
function logout() {
    authToken = null
    currentUser = null
    localStorage.removeItem("authToken")
    localStorage.removeItem("currentUser")

    showNotification("Вы вышли из системы", "info")
    showLogin()
}

// Загрузка категорий
async function loadCategories() {
    // Запрашивает категории у сервера (/api/ItemCategories)
    try {
        const response = await fetch("/api/ItemCategories", {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        })

        if (response.ok) {
            categories = await response.json()
            updateCategorySelects()
        } else {
            console.error("Failed to load categories")
            showNotification("Ошибка загрузки категорий", "error")
        }
    } catch (error) {
        console.error("Error loading categories:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Обновление выпадающих списков категорий
function updateCategorySelects() {
    const selects = ["todoCategory", "editCategory", "filterCategory"]

    selects.forEach((selectId) => {
        const select = document.getElementById(selectId)
        const currentValue = select.value

        // Очищаем опции, кроме первой
        while (select.children.length > 1) {
            select.removeChild(select.lastChild)
        }

        // Добавляем категории
        categories.forEach((category) => {
            const option = document.createElement("option")
            option.value = category.id
            option.textContent = category.name
            select.appendChild(option)
        })

        // Восстанавливаем выбранное значение
        select.value = currentValue
    })
}

// Создание категории
async function handleCreateCategory(e) {
    e.preventDefault()

    const name = document.getElementById("categoryName").value.trim()

    if (!name) {
        showNotification("Введите название категории", "error")
        return
    }

    // Создаёт новую категорию через POST-запрос
    try {
        const response = await fetch("/api/ItemCategories", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ name }),
        })

        if (response.ok) {
            showNotification("Категория создана успешно!", "success")
            document.getElementById("categoryForm").reset()
            loadCategories()
        } else {
            const error = await response.json()
            showNotification(error.message || "Ошибка создания категории", "error")
        }
    } catch (error) {
        console.error("Error creating category:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Загружает список дел с сервера (/api/TodoItems)
async function loadTodos() {
    try {
        console.log("Loading todos...")
        const response = await fetch("/api/TodoItems", {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        })

        if (response.ok) {
            todos = await response.json()
            console.log("Loaded todos:", todos)
            renderTodos()
            updateStatistics()
        } else {
            console.error("Failed to load todos, status:", response.status)
            const errorText = await response.text()
            console.error("Error response:", errorText)
            showNotification("Ошибка загрузки дел", "error")
        }
    } catch (error) {
        console.error("Error loading todos:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Создаёт новое дело через POST-запрос
async function handleCreateTodo(e) {
    e.preventDefault()

    const name = document.getElementById("todoName").value.trim()
    const categoryId = document.getElementById("todoCategory").value || null
    const status = Number.parseInt(document.getElementById("todoStatus").value)

    if (!name) {
        showNotification("Введите название дела", "error")
        return
    }

    console.log("Creating todo:", { name, categoryId, status })

    try {
        const requestBody = {
            name,
            categoryId: categoryId ? Number.parseInt(categoryId) : null,
            status,
        }

        console.log("Request body:", requestBody)

        const response = await fetch("/api/TodoItems", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(requestBody),
        })

        console.log("Response status:", response.status)

        if (response.ok) {
            const result = await response.json()
            console.log("Created todo:", result)
            showNotification("Дело создано успешно!", "success")
            document.getElementById("todoForm").reset()
            loadTodos()
        } else {
            const errorText = await response.text()
            console.error("Error response:", errorText)
            try {
                const error = JSON.parse(errorText)
                showNotification(error.message || "Ошибка создания дела", "error")
            } catch {
                showNotification("Ошибка создания дела", "error")
            }
        }
    } catch (error) {
        console.error("Error creating todo:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Обновление статистики
function updateStatistics() {
    const total = todos.length
    const notStarted = todos.filter((t) => t.status === 0).length
    const inProgress = todos.filter((t) => t.status === 1).length
    const completed = todos.filter((t) => t.status === 2).length

    document.getElementById("totalTodos").textContent = total
    document.getElementById("notStartedTodos").textContent = notStarted
    document.getElementById("inProgressTodos").textContent = inProgress
    document.getElementById("completedTodos").textContent = completed
}

// Отображает список дел в таблице, применяя фильтры
function renderTodos() {
    const tbody = document.getElementById("todoList")

    if (todos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>Нет дел
                </td>
            </tr>
        `
        return
    }

    const filteredTodos = getFilteredTodos()

    if (filteredTodos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-search me-2"></i>Нет дел, соответствующих фильтрам
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = filteredTodos
        .map(
            (todo) => `
        <tr>
            <td>
                <strong>${escapeHtml(todo.name)}</strong>
            </td>
            <td>
                ${todo.category ? `<span class="badge bg-secondary">${escapeHtml(todo.category.name)}</span>` : '<span class="text-muted">Без категории</span>'}
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateTodoStatus(${todo.id}, this.value)" style="width: auto;">
                    <option value="0" ${todo.status === 0 ? "selected" : ""}>Не выполнено</option>
                    <option value="1" ${todo.status === 1 ? "selected" : ""}>В процессе</option>
                    <option value="2" ${todo.status === 2 ? "selected" : ""}>Выполнено</option>
                </select>
            </td>
            <td>
                <button class="btn btn-outline-primary btn-sm me-1" onclick="editTodo(${todo.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTodo(${todo.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
        )
        .join("")
}

// Получение отфильтрованных дел
function getFilteredTodos() {
    const categoryFilter = document.getElementById("filterCategory").value
    const statusFilter = document.getElementById("filterStatus").value

    return todos.filter((todo) => {
        const categoryMatch = !categoryFilter || (todo.categoryId && todo.categoryId.toString() === categoryFilter)

        const statusMatch = statusFilter === "" || todo.status.toString() === statusFilter

        return categoryMatch && statusMatch
    })
}

// Применение фильтров
function applyFilters() {
    renderTodos()
}

// Очистка фильтров
function clearFilters() {
    document.getElementById("filterCategory").value = ""
    document.getElementById("filterStatus").value = ""
    renderTodos()
}

// Обновляет статус дела через PATCH-запрос
async function updateTodoStatus(id, status) {
    try {
        const response = await fetch(`/api/TodoItems/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status: Number.parseInt(status) }),
        })

        if (response.ok) {
            // Обновляем локальные данные
            const todo = todos.find((t) => t.id === id)
            if (todo) {
                todo.status = Number.parseInt(status)
            }
            updateStatistics()
            showNotification("Статус обновлен!", "success")
        } else {
            const error = await response.json()
            showNotification(error.message || "Ошибка обновления статуса", "error")
            loadTodos() // Перезагружаем данные
        }
    } catch (error) {
        console.error("Error updating status:", error)
        showNotification("Ошибка соединения с сервером", "error")
        loadTodos() // Перезагружаем данные
    }
}

// Открывает модальное окно для редактирования дела
function editTodo(id) {
    console.log("Edit todo called with id:", id)

    const todo = todos.find((t) => t.id === id)
    if (!todo) {
        console.error("Todo not found:", id)
        showNotification("Дело не найдено", "error")
        return
    }

    console.log("Found todo:", todo)

    // Заполняем форму
    document.getElementById("editId").value = todo.id
    document.getElementById("editName").value = todo.name
    document.getElementById("editCategory").value = todo.categoryId || ""
    document.getElementById("editStatus").value = todo.status

    // Обновляем категории в модальном окне
    updateCategorySelects()

    // Показываем модальное окно
    try {
        const modalElement = document.getElementById("editModal")
        console.log("Modal element:", modalElement)

        const modal = new bootstrap.Modal(modalElement)
        console.log("Modal instance created:", modal)

        modal.show()
        console.log("Modal show called")
    } catch (error) {
        console.error("Error showing modal:", error)
        showNotification("Ошибка открытия окна редактирования", "error")
    }
}

// Сохраняет изменения через PUT запрос
async function saveEdit() {
    const id = Number.parseInt(document.getElementById("editId").value)
    const name = document.getElementById("editName").value.trim()
    const categoryId = document.getElementById("editCategory").value || null
    const status = Number.parseInt(document.getElementById("editStatus").value)

    if (!name) {
        showNotification("Введите название дела", "error")
        return
    }

    try {
        const response = await fetch(`/api/TodoItems/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                id,
                name,
                categoryId: categoryId ? Number.parseInt(categoryId) : null,
                status,
            }),
        })

        if (response.ok) {
            showNotification("Дело обновлено успешно!", "success")

            // Закрываем модальное окно
            const modalElement = document.getElementById("editModal")
            const modal = bootstrap.Modal.getInstance(modalElement)
            if (modal) {
                modal.hide()
            }

            loadTodos()
        } else {
            const error = await response.json()
            showNotification(error.message || "Ошибка обновления дела", "error")
        }
    } catch (error) {
        console.error("Error updating todo:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Удаляет дело через DELETE запрос
async function deleteTodo(id) {
    if (!confirm("Вы уверены, что хотите удалить это дело?")) {
        return
    }

    try {
        const response = await fetch(`/api/TodoItems/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        })

        if (response.ok) {
            showNotification("Дело удалено успешно!", "success")
            loadTodos()
        } else {
            const error = await response.json()
            showNotification(error.message || "Ошибка удаления дела", "error")
        }
    } catch (error) {
        console.error("Error deleting todo:", error)
        showNotification("Ошибка соединения с сервером", "error")
    }
}

// Показ уведомлений
function showNotification(message, type = "info") {
    const notifications = document.getElementById("notifications")
    const id = "notification-" + Date.now()

    const alertClass =
        {
            success: "alert-success",
            error: "alert-danger",
            warning: "alert-warning",
            info: "alert-info",
        }[type] || "alert-info"

    const icon =
        {
            success: "fas fa-check-circle",
            error: "fas fa-exclamation-circle",
            warning: "fas fa-exclamation-triangle",
            info: "fas fa-info-circle",
        }[type] || "fas fa-info-circle"

    const notification = document.createElement("div")
    notification.id = id
    notification.className = `alert ${alertClass} alert-dismissible fade show`
    notification.innerHTML = `
        <i class="${icon} me-2"></i>${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    notifications.appendChild(notification)

    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
            const alert = bootstrap.Alert.getOrCreateInstance(element)
            alert.close()
        }
    }, 5000)
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
}
