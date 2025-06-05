using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ToDo.Models;

namespace ToDo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TodoItemsController : ControllerBase
    {
        private readonly TodoContext _context;
        private readonly ILogger<TodoItemsController> _logger;

        public TodoItemsController(TodoContext context, ILogger<TodoItemsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TodoItemDto>>> GetTodoItems()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation($"Getting todo items for user: {userId}");
                
                var items = await _context.TodoItems
                    .Where(t => t.UserId == userId)
                    .Include(t => t.Category)
                    .ToListAsync();
                
                var result = items.Select(t => new TodoItemDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Status = t.CurrentStatus,
                    IsComplete = t.IsComplete,
                    CategoryId = t.CategoryId,
                    Category = t.Category != null ? new CategoryDto
                    {
                        Id = t.Category.Id,
                        Name = t.Category.Name
                    } : null
                }).ToList();
                
                _logger.LogInformation($"Found {result.Count} todo items");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting todo items");
                return StatusCode(500, new { Message = "Ошибка получения списка дел" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<TodoItemDto>> PostTodoItem([FromBody] CreateTodoItemRequest request)
        {
            _logger.LogInformation("=== POST TODO ITEM REQUEST RECEIVED ===");
            
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation($"User ID: {userId}");
                _logger.LogInformation($"Request object: {request?.GetType().Name}");
                _logger.LogInformation($"Request is null: {request == null}");
                
                if (request == null)
                {
                    _logger.LogWarning("Request is null");
                    return BadRequest(new { Message = "Данные не переданы" });
                }

                _logger.LogInformation($"Request name: '{request.Name}'");
                _logger.LogInformation($"Request status: {request.Status}");
                _logger.LogInformation($"Request categoryId: {request.CategoryId}");

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    _logger.LogWarning("Todo item name is empty or null");
                    return BadRequest(new { Message = "Название дела обязательно" });
                }

                _logger.LogInformation($"Creating todo item '{request.Name}' for user {userId}");

                // Проверяем, что категория принадлежит пользователю (если указана)
                ItemCategory? category = null;
                if (request.CategoryId.HasValue && request.CategoryId > 0)
                {
                    _logger.LogInformation($"Checking category {request.CategoryId} for user {userId}");
                    category = await _context.ItemCategories.FindAsync(request.CategoryId);
                    if (category == null || category.UserId != userId)
                    {
                        _logger.LogWarning($"Category {request.CategoryId} not found or doesn't belong to user {userId}");
                        return BadRequest(new { Message = "Указанная категория не найдена или не принадлежит пользователю" });
                    }
                    _logger.LogInformation($"Category {request.CategoryId} is valid");
                }

                var newTodoItem = new TodoItem
                {
                    Name = request.Name.Trim(),
                    CurrentStatus = request.Status,
                    UserId = userId,
                    CategoryId = request.CategoryId > 0 ? request.CategoryId : null
                };

                _logger.LogInformation($"Adding todo item to database: {newTodoItem.Name}");
                _context.TodoItems.Add(newTodoItem);
                
                _logger.LogInformation("Saving changes to database");
                await _context.SaveChangesAsync();

                // Перезагружаем объект с категорией
                var savedItem = await _context.TodoItems
                    .Include(t => t.Category)
                    .FirstOrDefaultAsync(t => t.Id == newTodoItem.Id);

                // Возвращаем DTO
                var result = new TodoItemDto
                {
                    Id = savedItem.Id,
                    Name = savedItem.Name,
                    Status = savedItem.CurrentStatus,
                    IsComplete = savedItem.IsComplete,
                    CategoryId = savedItem.CategoryId,
                    Category = savedItem.Category != null ? new CategoryDto
                    {
                        Id = savedItem.Category.Id,
                        Name = savedItem.Category.Name
                    } : null
                };

                _logger.LogInformation($"Successfully created todo item {newTodoItem.Id} for user {userId}");
                return CreatedAtAction(nameof(GetTodoItem), new { id = newTodoItem.Id }, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating todo item");
                return StatusCode(500, new { Message = $"Ошибка создания дела: {ex.Message}" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItemDto>> GetTodoItem(long id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var todoItem = await _context.TodoItems
                    .Include(t => t.Category)
                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (todoItem == null)
                {
                    return NotFound(new { Message = "Дело не найдено" });
                }

                var result = new TodoItemDto
                {
                    Id = todoItem.Id,
                    Name = todoItem.Name,
                    Status = todoItem.CurrentStatus,
                    IsComplete = todoItem.IsComplete,
                    CategoryId = todoItem.CategoryId,
                    Category = todoItem.Category != null ? new CategoryDto
                    {
                        Id = todoItem.Category.Id,
                        Name = todoItem.Category.Name
                    } : null
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting todo item {id}");
                return StatusCode(500, new { Message = "Ошибка получения дела" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTodoItem(long id, [FromBody] UpdateTodoItemRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { Message = "Данные не переданы" });
                }

                if (id != request.Id)
                {
                    return BadRequest(new { Message = "ID не совпадает" });
                }

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { Message = "Название дела обязательно" });
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var existingItem = await _context.TodoItems.FindAsync(id);
                
                if (existingItem == null || existingItem.UserId != userId)
                {
                    return NotFound(new { Message = "Дело не найдено" });
                }

                // Проверяем, что категория принадлежит пользователю (если указана)
                if (request.CategoryId.HasValue && request.CategoryId > 0)
                {
                    var category = await _context.ItemCategories.FindAsync(request.CategoryId);
                    if (category == null || category.UserId != userId)
                    {
                        return BadRequest(new { Message = "Указанная категория не найдена или не принадлежит пользователю" });
                    }
                }

                existingItem.Name = request.Name.Trim();
                existingItem.CurrentStatus = request.Status;
                existingItem.CategoryId = request.CategoryId > 0 ? request.CategoryId : null;

                _context.Entry(existingItem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated todo item {id} for user {userId}");
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoItemExists(id))
                {
                    return NotFound(new { Message = "Дело не найдено" });
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating todo item {id}");
                return StatusCode(500, new { Message = "Ошибка обновления дела" });
            }
        }

        // Новый метод для быстрого обновления статуса
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTodoItemStatus(long id, [FromBody] UpdateStatusRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var existingItem = await _context.TodoItems.FindAsync(id);
                
                if (existingItem == null || existingItem.UserId != userId)
                {
                    return NotFound(new { Message = "Дело не найдено" });
                }

                existingItem.CurrentStatus = request.Status;
                _context.Entry(existingItem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated status for todo item {id} to {request.Status} for user {userId}");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating status for todo item {id}");
                return StatusCode(500, new { Message = "Ошибка обновления статуса" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTodoItem(long id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var todoItem = await _context.TodoItems.FindAsync(id);
                
                if (todoItem == null || todoItem.UserId != userId)
                {
                    return NotFound(new { Message = "Дело не найдено" });
                }

                _context.TodoItems.Remove(todoItem);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Deleted todo item {id} for user {userId}");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting todo item {id}");
                return StatusCode(500, new { Message = "Ошибка удаления дела" });
            }
        }

        private bool TodoItemExists(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return _context.TodoItems.Any(e => e.Id == id && e.UserId == userId);
        }
    }

    // DTO классы
    public class TodoItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TodoStatus Status { get; set; }
        public bool IsComplete { get; set; }
        public long? CategoryId { get; set; }
        public CategoryDto? Category { get; set; }
    }

    public class CategoryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    // Классы запросов
    public class CreateTodoItemRequest
    {
        public string Name { get; set; } = string.Empty;
        public TodoStatus Status { get; set; } = TodoStatus.NotStarted;
        public long? CategoryId { get; set; }
    }

    public class UpdateTodoItemRequest
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TodoStatus Status { get; set; }
        public long? CategoryId { get; set; }
    }

    public class UpdateStatusRequest
    {
        public TodoStatus Status { get; set; }
    }
}
