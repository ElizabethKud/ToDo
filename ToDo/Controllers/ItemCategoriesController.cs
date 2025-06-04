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
    public class ItemCategoriesController : ControllerBase
    {
        private readonly TodoContext _context;
        private readonly ILogger<ItemCategoriesController> _logger;

        public ItemCategoriesController(TodoContext context, ILogger<ItemCategoriesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ItemCategory>>> GetItemCategories()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation($"Getting categories for user: {userId}");
                
                var categories = await _context.ItemCategories
                    .Where(c => c.UserId == userId)
                    .ToListAsync();
                
                _logger.LogInformation($"Found {categories.Count} categories");
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting categories");
                return StatusCode(500, new { Message = "Ошибка получения категорий" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ItemCategory>> PostItemCategory([FromBody] CreateCategoryRequest request)
        {
            _logger.LogInformation("=== POST REQUEST RECEIVED ===");
            _logger.LogInformation($"Request object: {request}");
            _logger.LogInformation($"Request is null: {request == null}");
            
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation($"User ID: {userId}");
                
                if (request == null)
                {
                    _logger.LogWarning("Request is null");
                    return BadRequest(new { Message = "Данные не переданы" });
                }

                _logger.LogInformation($"Request name: '{request.Name}'");

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    _logger.LogWarning("Category name is empty or null");
                    return BadRequest(new { Message = "Название категории обязательно" });
                }

                _logger.LogInformation($"Creating category '{request.Name}' for user {userId}");

                // Проверяем, что категория с таким именем не существует у пользователя
                var existingCategory = await _context.ItemCategories
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Name.ToLower() == request.Name.ToLower().Trim());

                if (existingCategory != null)
                {
                    _logger.LogWarning($"Category with name '{request.Name}' already exists for user {userId}");
                    return BadRequest(new { Message = "Категория с таким названием уже существует" });
                }

                var newCategory = new ItemCategory
                {
                    Name = request.Name.Trim(),
                    UserId = userId
                };

                _logger.LogInformation($"Adding category to database: {newCategory.Name}");
                _context.ItemCategories.Add(newCategory);
                
                _logger.LogInformation("Saving changes to database");
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Successfully created category {newCategory.Id} for user {userId}");
                return CreatedAtAction(nameof(GetItemCategory), new { id = newCategory.Id }, newCategory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating category");
                return StatusCode(500, new { Message = $"Ошибка создания категории: {ex.Message}" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ItemCategory>> GetItemCategory(long id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var itemCategory = await _context.ItemCategories
                    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

                if (itemCategory == null)
                {
                    return NotFound(new { Message = "Категория не найдена" });
                }

                return Ok(itemCategory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting category {id}");
                return StatusCode(500, new { Message = "Ошибка получения категории" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutItemCategory(long id, [FromBody] CreateCategoryRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request?.Name))
                {
                    return BadRequest(new { Message = "Название категории обязательно" });
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var existingCategory = await _context.ItemCategories.FindAsync(id);
                
                if (existingCategory == null || existingCategory.UserId != userId)
                {
                    return NotFound(new { Message = "Категория не найдена" });
                }

                existingCategory.Name = request.Name.Trim();

                _context.Entry(existingCategory).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated category {id} for user {userId}");
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ItemCategoryExists(id))
                {
                    return NotFound(new { Message = "Категория не найдена" });
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating category {id}");
                return StatusCode(500, new { Message = "Ошибка обновления категории" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteItemCategory(long id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var itemCategory = await _context.ItemCategories.FindAsync(id);
                
                if (itemCategory == null || itemCategory.UserId != userId)
                {
                    return NotFound(new { Message = "Категория не найдена" });
                }

                // Проверяем, есть ли дела в этой категории
                var itemsInCategory = await _context.TodoItems
                    .Where(t => t.CategoryId == id && t.UserId == userId)
                    .CountAsync();

                if (itemsInCategory > 0)
                {
                    return BadRequest(new { Message = "Нельзя удалить категорию, в которой есть дела" });
                }

                _context.ItemCategories.Remove(itemCategory);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Deleted category {id} for user {userId}");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting category {id}");
                return StatusCode(500, new { Message = "Ошибка удаления категории" });
            }
        }

        private bool ItemCategoryExists(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return _context.ItemCategories.Any(e => e.Id == id && e.UserId == userId);
        }
    }

    // Отдельный класс для запроса создания категории
    public class CreateCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}