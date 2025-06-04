using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToDo.Models
{
    public class ItemCategory
    {
        public long Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string UserId { get; set; } = string.Empty;
        
        // Игнорируем это свойство при сериализации, чтобы избежать циклических ссылок
        [JsonIgnore]
        public List<TodoItem> TodoItems { get; set; } = new List<TodoItem>();
    }
}