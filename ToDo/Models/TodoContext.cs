using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ToDo.Models
{
    public class TodoContext : IdentityDbContext
    {
        public DbSet<TodoItem> TodoItems { get; set; }
        public DbSet<ItemCategory> ItemCategories { get; set; }

        public TodoContext(DbContextOptions<TodoContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Настройка связей между таблицами
            modelBuilder.Entity<TodoItem>()
                .HasOne(t => t.Category)
                .WithMany(c => c.TodoItems)
                .HasForeignKey(t => t.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}