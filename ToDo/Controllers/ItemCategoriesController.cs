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

        public ItemCategoriesController(TodoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ItemCategory>>> GetItemCategories()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return await _context.ItemCategories
                .Where(c => c.UserId == userId)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ItemCategory>> GetItemCategory(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var itemCategory = await _context.ItemCategories
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            if (itemCategory == null)
            {
                return NotFound();
            }

            return itemCategory;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutItemCategory(long id, ItemCategory itemCategory)
        {
            if (id != itemCategory.Id)
            {
                return BadRequest();
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var existingCategory = await _context.ItemCategories.FindAsync(id);
            if (existingCategory == null || existingCategory.UserId != userId)
            {
                return NotFound();
            }

            existingCategory.Name = itemCategory.Name;

            _context.Entry(existingCategory).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ItemCategoryExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<ItemCategory>> PostItemCategory(ItemCategory itemCategory)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            itemCategory.UserId = userId;

            _context.ItemCategories.Add(itemCategory);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetItemCategory), new { id = itemCategory.Id }, itemCategory);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteItemCategory(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var itemCategory = await _context.ItemCategories.FindAsync(id);
            if (itemCategory == null || itemCategory.UserId != userId)
            {
                return NotFound();
            }

            _context.ItemCategories.Remove(itemCategory);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ItemCategoryExists(long id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return _context.ItemCategories.Any(e => e.Id == id && e.UserId == userId);
        }
    }
}