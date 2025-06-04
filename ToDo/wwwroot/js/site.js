const todoUri = '/api/TodoItems';
const categoryUri = '/api/ItemCategories';
let todos = [];
let categories = [];
let token = localStorage.getItem('token');

function checkAuth() {
    if (token) {
        // Проверяем валидность токена
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;

            if (payload.exp < currentTime) {
                // Токен истек
                localStorage.removeItem('token');
                token = null;
                checkAuth();
                return;
            }

            document.getElementById('authSection').style.display = 'none';
            document.getElementById('todoSection').style.display = 'block';
            getCategories();
            getItems();
        } catch (error) {
            // Неверный токен
            localStorage.removeItem('token');
            token = null;
            checkAuth();
        }
    } else {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('todoSection').style.display = 'none';
    }
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    fetch('/api/Auth/Login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                token = data.token;
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                checkAuth();
            }
        })
        .catch(error => {
            console.error('Ошибка входа:', error);
            alert(error.Message || 'Ошибка входа в систему');
        });
}

function register() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!username || !email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    fetch('/api/Auth/Register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            alert('Регистрация успешна! Теперь войдите в систему.');
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
        })
        .catch(error => {
            console.error('Ошибка регистрации:', error);
            alert(error.Message || 'Ошибка регистрации');
        });
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    todos = [];
    categories = [];
    checkAuth();
}

function getItems() {
    fetch(todoUri, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка получения списка дел');
            }
            return response.json();
        })
        .then(data => {
            todos = data;
            filterItems();
        })
        .catch(error => {
            console.error('Unable to get items.', error);
            if (error.message.includes('401')) {
                logout();
            }
        });
}

function getCategories() {
    fetch(categoryUri, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка получения категорий');
            }
            return response.json();
        })
        .then(data => {
            categories = data;
            populateCategoryDropdowns();
        })
        .catch(error => {
            console.error('Unable to get categories.', error);
            if (error.message.includes('401')) {
                logout();
            }
        });
}

function populateCategoryDropdowns() {
    const addCategoryDropdown = document.getElementById('add-category');
    const editCategoryDropdown = document.getElementById('edit-category');
    const filterCategoryDropdown = document.getElementById('filter-category');

    addCategoryDropdown.innerHTML = '<option value="">-- Выберите категорию --</option>';
    editCategoryDropdown.innerHTML = '<option value="">-- Выберите категорию --</option>';
    filterCategoryDropdown.innerHTML = '<option value="">Все категории</option>';

    categories.forEach(category => {
        const option1 = document.createElement('option');
        option1.value = category.id;
        option1.text = category.name;
        addCategoryDropdown.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = category.id;
        option2.text = category.name;
        editCategoryDropdown.appendChild(option2);

        const option3 = document.createElement('option');
        option3.value = category.id;
        option3.text = category.name;
        filterCategoryDropdown.appendChild(option3);
    });
}

function addItem() {
    const addNameTextbox = document.getElementById('add-name');
    const categoryDropdown = document.getElementById('add-category');

    if (!addNameTextbox.value.trim()) {
        alert('Пожалуйста, введите название дела');
        return;
    }

    const item = {
        isComplete: false,
        name: addNameTextbox.value.trim(),
        categoryId: categoryDropdown.value ? parseInt(categoryDropdown.value) : null
    };

    fetch(todoUri, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка добавления дела');
            }
            return response.json();
        })
        .then(() => {
            getItems();
            addNameTextbox.value = '';
            categoryDropdown.value = '';
        })
        .catch(error => {
            console.error('Unable to add item.', error);
            alert('Ошибка добавления дела');
        });
}

function addCategory() {
    const categoryNameTextbox = document.getElementById('add-category-name');

    if (!categoryNameTextbox.value.trim()) {
        alert('Пожалуйста, введите название категории');
        return;
    }

    const category = {
        name: categoryNameTextbox.value.trim()
    };

    fetch(categoryUri, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(category)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка добавления категории');
            }
            return response.json();
        })
        .then(() => {
            getCategories();
            categoryNameTextbox.value = '';
        })
        .catch(error => {
            console.error('Unable to add category.', error);
            alert('Ошибка добавления категории');
        });
}

function deleteItem(id) {
    if (!confirm('Вы уверены, что хотите удалить это дело?')) {
        return;
    }

    fetch(todoUri + '/' + id, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка удаления дела');
            }
            getItems();
        })
        .catch(error => {
            console.error('Unable to delete item.', error);
            alert('Ошибка удаления дела');
        });
}

function displayEditForm(id) {
    const item = todos.find(item => item.id === id);

    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-isComplete').checked = item.isComplete;
    document.getElementById('edit-category').value = item.categoryId || '';
    document.getElementById('editForm').style.display = 'block';
}

function updateItem() {
    const itemId = document.getElementById('edit-id').value;
    const categoryDropdown = document.getElementById('edit-category');
    const nameValue = document.getElementById('edit-name').value.trim();

    if (!nameValue) {
        alert('Пожалуйста, введите название дела');
        return;
    }

    const item = {
        id: parseInt(itemId, 10),
        isComplete: document.getElementById('edit-isComplete').checked,
        name: nameValue,
        categoryId: categoryDropdown.value ? parseInt(categoryDropdown.value) : null
    };

    fetch(todoUri + '/' + itemId, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка обновления дела');
            }
            getItems();
            closeInput();
        })
        .catch(error => {
            console.error('Unable to update item.', error);
            alert('Ошибка обновления дела');
        });

    return false;
}

function closeInput() {
    document.getElementById('editForm').style.display = 'none';
}

function filterItems() {
    const categoryFilter = document.getElementById('filter-category').value;
    const statusFilter = document.getElementById('filter-status').value;

    let filteredTodos = todos;

    if (categoryFilter) {
        filteredTodos = filteredTodos.filter(item => item.categoryId == categoryFilter);
    }

    if (statusFilter !== '') {
        const isComplete = statusFilter === 'true';
        filteredTodos = filteredTodos.filter(item => item.isComplete === isComplete);
    }

    _displayItems(filteredTodos);
    _displayCount(filteredTodos.length);
}

function _displayCount(itemCount) {
    let name;
    if (itemCount === 1) {
        name = 'дело';
    } else if (itemCount >= 2 && itemCount <= 4) {
        name = 'дела';
    } else {
        name = 'дел';
    }
    document.getElementById('counter').innerText = `${itemCount} ${name}`;
}

function _displayItems(data) {
    const tBody = document.getElementById('todos');
    tBody.innerHTML = '';

    const button = document.createElement('button');

    data.forEach(item => {
        let isCompleteCheckbox = document.createElement('input');
        isCompleteCheckbox.type = 'checkbox';
        isCompleteCheckbox.disabled = true;
        isCompleteCheckbox.checked = item.isComplete;

        let editButton = button.cloneNode(false);
        editButton.innerText = 'Редактировать';
        editButton.setAttribute('onclick', 'displayEditForm(' + item.id + ')');

        let deleteButton = button.cloneNode(false);
        deleteButton.innerText = 'Удалить';
        deleteButton.setAttribute('onclick', 'deleteItem(' + item.id + ')');

        let tr = tBody.insertRow();

        // Добавляем класс для выполненных дел
        if (item.isComplete) {
            tr.style.backgroundColor = '#f0f8f0';
            tr.style.textDecoration = 'line-through';
            tr.style.opacity = '0.7';
        }

        let td1 = tr.insertCell(0);
        td1.appendChild(isCompleteCheckbox);

        let td2 = tr.insertCell(1);
        let textNode = document.createTextNode(item.name);
        td2.appendChild(textNode);

        let td3 = tr.insertCell(2);
        let categoryName = item.category ? item.category.name : 'Без категории';
        let categoryNode = document.createTextNode(categoryName);
        td3.appendChild(categoryNode);

        let td4 = tr.insertCell(3);
        td4.appendChild(editButton);

        let td5 = tr.insertCell(4);
        td5.appendChild(deleteButton);
    });
}