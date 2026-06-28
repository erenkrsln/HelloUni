import { driver } from "driver.js";

export function startAppTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayColor: "rgba(59, 59, 59, 0.7)",
    stagePadding: 6,
    stageRadius: 36,
    nextBtnText: "Weiter",
    prevBtnText: "Zurück",
    doneBtnText: "Fertig",
    progressText: "{{current}} von {{total}}",
    steps: [
      {
        popover: {
          title: "Willkommen bei HelloUni",
          description: "<img src='https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3RnaDF1NTBrMXZnMzlvaXh4enZ3bnEzNGNoZmNrdTFiYjN3Z213dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wj7lNjMNDxSmc/giphy.gif' style='height: 202.5px; width: 270px;' />Schön, dass du hier bist! <br/> In diesem kurzenTutorial erklären wir dir die wichtigsten Funktionen der Webapp."
        }
      },
      {
        element: "#tour-profile-menu",
        popover: {
          title: "Die rechte Seitenleiste",
          description: "Hier findest du alle wichtigen Bereiche wie dein Profil, die Infoseiten, Einstellungen und mehr.",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "#tour-nav-notifications",
        popover: {
          title: "Benachrichtigungen",
          description: "Hier siehst du neue Likes, Kommentare und neue Follower.",
          side: "bottom",
          align: "center"
        }
      },
      {
        element: "#tour-logo-menu",
        popover: {
          title: "Die linke Seitenleiste",
          description: "Hier findest du Informationen über das Projekt und unser Team, sowie das Impressum und unsere Datenschutzrichtlinien.",
          side: "bottom",
          align: "end"
        }
      },
      {
        element: "#tour-nav-home",
        popover: {
          title: "Posts",
          description: "Hier siehst du neue Posts, gefiltert nach deinen Interessen.",
          side: "top",
          align: "center"
        }
      },
      {
        element: "#tour-nav-search",
        popover: {
          title: "Suche",
          description: "Hier kannst du nach öffentlichen Gruppen, Profilen anderer Studierender oder nach bestimmten Posts suchen.",
          side: "top",
          align: "center"
        }
      },

      {
        element: "#tour-nav-chat",
        popover: {
          title: "Chats",
          description: "Hier siehst du alle neuen Nachrichten und kannst neue Unterhaltungen beginnen.",
          side: "top",
          align: "center"
        }
      },
      {
        element: "#tour-nav-workspace",
        popover: {
          title: "Workspace",
          description: "Hier findest du deine Gruppen, Aufgaben, Dateien und Events für dein Studium.",
          side: "top",
          align: "center"
        }
      },
      {
        popover: {
          title: "HelloUni installieren",
          description: "Installiere HelloUni auf deinem Gerät, um das beste Erlebnis zu haben. <br/> Eine Anleitung dazu findest du in der rechten Seitenleiste."
        }
      }
    ]
  });

  driverObj.drive();
}
