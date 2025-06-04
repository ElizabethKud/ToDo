const todoUri = '/api/TodoItems';
const categoryUri = '/api/ItemCategories';
let todos = [];
let categories = [];
let token = localStorage.getItem('token');

function checkAuth() {
    if (token) {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('todoSection').style.display = 'block';
        getCategories();
        getItems();
    } else {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('todoSection').style.display = 'none';
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    fetch('/api/Auth/Login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                token = data.token;
                checkAuth();
            } else {
                alert('Ошибка входа');
            }
        })
        .catch(error => console.error('Ошибка входа:', error));
}

function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    fetch('/api/Auth/Register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('Регистрация успешна! Теперь войдите.');
            } else {
                alert('Ошибка регистрации');
            }
        })
        .catch(error => console.error('Ошибка регистрации:', error));
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    checkAuth();
}

function getItems() {
    fetch(todoUri, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            todos = data;
            filterItems();
        })
        .catch(error => console.error('Unable to get items.', error));
}

function getCategories() {
    fetch(categoryUri, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            categories = data;
            populateCategoryDropdowns();
        })
        .catch(error => console.error('Unable to get categories.', error));
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

    const item = {
        isComplete: false,
        name: addNameTextbox.value.trim(),
        categoryId: parseInt(categoryDropdown.value) || 0
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
        .then(response => response.json())
        .then(() => {
            getItems();
            addNameTextbox.value = '';
            categoryDropdown.value = '';
        })
        .catch(error => console.error('Unable to add item.', error));
}

function addCategory() {
    const categoryNameTextbox = document.getElementById('add-category-name');

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
        .then(response => response.json())
        .then(() => {
            getCategories();
            categoryNameTextbox.value = '';
        })
        .catch(error => console.error('Unable to add category.', error));
}

function deleteItem(id) {
    fetch(todoUri + '/' + id, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(() => getItems())
        .catch(error => console.error('Unable to delete item.', error));
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

    const item = {
        id: parseInt(itemId, 10),
        isComplete: document.getElementById('edit-isComplete').checked,
        name: document.getElementById('edit-name').value.trim(),
        categoryId: parseInt(categoryDropdown.value) || 0
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
        .then(() => getItems())
        .catch(error => console.error('Unable to update item.', error));

    closeInput();

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
    const name = (itemCount === 1) ? 'дело' : 'дела';
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

    todos = data;
}