import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if users exist, if not create them
    let users = await ctx.db.query("users").collect();

    if (users.length === 0) {
      const user1 = await ctx.db.insert("users", {
        name: "Max Mustermann",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
        uni_name: "TU München",
        major: "Informatik",
      });

      const user2 = await ctx.db.insert("users", {
        name: "Anna Schmidt",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
        uni_name: "LMU München",
        major: "BWL",
      });

      const user3 = await ctx.db.insert("users", {
        name: "Tom Weber",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
        uni_name: "TU Berlin",
        major: "Maschinenbau",
      });

      users = [
        { _id: user1, name: "Max Mustermann", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", uni_name: "TU München", major: "Informatik" },
        { _id: user2, name: "Anna Schmidt", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna", uni_name: "LMU München", major: "BWL" },
        { _id: user3, name: "Tom Weber", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom", uni_name: "TU Berlin", major: "Maschinenbau" },
      ];
    }

    // Check if posts exist
    const existingPosts = await ctx.db.query("posts").collect();
    if (existingPosts.length > 0) {
      return { message: "Data already seeded", users: users.length, posts: existingPosts.length };
    }

    // Create posts using existing users
    await ctx.db.insert("posts", {
      userId: users[0]._id,
      content: "Gerade die beste Vorlesung gehabt! Machine Learning wird immer spannender. Wer hat noch Tipps für gute Ressourcen?",
      imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4a18d93?w=800&h=600&fit=crop",
      likesCount: 12,
      commentsCount: 5,
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
    });

    await ctx.db.insert("posts", {
      userId: users[1]._id,
      content: "Endlich Semesterferien! Zeit für ein Praktikum und Reisen. Wo seid ihr alle hin?",
      likesCount: 28,
      commentsCount: 8,
      createdAt: Date.now() - 5 * 60 * 60 * 1000,
    });

    await ctx.db.insert("posts", {
      userId: users[2]._id,
      content: "Projektarbeit läuft super. Unser Team hat heute einen wichtigen Meilenstein erreicht!",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
      likesCount: 15,
      commentsCount: 3,
      createdAt: Date.now() - 8 * 60 * 60 * 1000,
    });

    await ctx.db.insert("posts", {
      userId: users[0]._id,
      content: "Neue Bibliothek entdeckt - perfekt zum Lernen! 📚",
      likesCount: 7,
      commentsCount: 2,
      createdAt: Date.now() - 12 * 60 * 60 * 1000,
    });

    await ctx.db.insert("posts", {
      userId: users[1]._id,
      content: "Wer hat Erfahrung mit Auslandssemestern? Würde gerne nach Amsterdam!",
      imageUrl: "https://images.unsplash.com/photo-1534351590666-13e3c96a0817?w=800&h=600&fit=crop",
      likesCount: 19,
      commentsCount: 12,
      createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    });

    return { message: "Seeded successfully", users: users.length, posts: 5 };
  },
});


