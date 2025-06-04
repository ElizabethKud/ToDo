namespace ToDo.Models
{
    public class ItemCategory
    {
        public long Id { get; set; }
        public string Name { get; set; }
        public string UserId { get; set; } // Для связи с пользователем
        public List<TodoItem> TodoItems { get; set; } = new List<TodoItem>(); // Навигационное свойство
    }
}