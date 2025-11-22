# **IEEE-HKN Budget Hack 2025:** 

## ***Smart Budget Scheduler for Chapter Growth***

"Design a smart, user-friendly tool that helps chapters plan their yearly budget, manage real-time expenses, track funding deadlines, and visualize spending trends.”

### **Functional requirements \- Mandatory features**

* **Expense and incomes tracking**: the application must support the management of both expenses and incomes. Users should be able to add, edit, and delete expenses and incomes. Transactions may be real-time (single) entries, recurring entries, or planned entries (to allocate budget for future events and activities). Transactions should be categorized (e.g., grants, sponsors, university funds for incomes) and may include optional notes for additional context.   
* **Budget planning**: the application must display both the actual balance (reflecting real-time financial status) and the projected balance (that includes draft and scheduled entries).   
* **Export reports:** the application must allow users to download reports on budgets, expenses, and incomes in PDF or CSV formats.  
* **Deadline Tracking**: the application must allow users to set financial deadlines (e.g. grant application deadlines) that must be shown in a dedicated section. 

### **Functional requirements \- Optional features**

* **Event-linked budgeting**: the application may allow users to group multiple expenses and incomes under a single event entry. Each event should have an unique allocated budget, included in projected balance.  
* **Multiple-budget**: the application may enable the management of multiple budgets, e.g. for different committees or purposes. Each transaction should be associated with a specific budget.  
* **Receipt management**: the application may allow users to upload and attach digital receipts or related documents (such as images or PDFs) to individual transactions.  
* **Analytics and report**: the application may generate summary reports and provide visualizations (e.g., charts) to illustrate budget usage, trends, and projections.


### **Technical requirements \- Mandatory features**

* **Application**: the budget scheduler must be delivered as a web application, accessible from desktop browsers. Development languages, libraries, and frameworks are chosen at the team's discretion.  
* **Open-source**: the application is meant to be open-source for later development and use by all chapters. The source code must be clear and with proper comments to ensure the work can be clearly understood.  
* **Authentication**: the application must implement user authentication using basic credentials (username and password), adhering to minimum security standards (e.g. password hashing).  
* **Containerization**: the application must be deployable using Docker.  
* **Database**: the application must utilize a relational database for data storage.  
* **Academic year-based**: budgets must be linked to the current academic year. Entries from previous academic years must remain accessible via a dedicated section.   
* **Local time**: dates and times must be stored as unix timestamps, the application must retrieve from the browser (or with a customization option) the time zone to show the local timestamp.

### **Technical requirements \- Optional features**

* **Mobile interface**: the application may offer a responsive layout or a dedicated mobile-optimized view.  
* **Multi user support**: the application may include support for multiple users with role-based access control.   
* **Advanced login**: the application may offer additional authentication capabilities, such as social login or two-factor authentication (2FA).  
* **Admin panel**: the application may include an admin panel for managing transaction categories, users, roles, permissions, and application customizations (e.g., theme, logo, color scheme).

**Judging Criteria:**

### **Hackathon Submission** (**deadline:** November 23rd, 23:59 EST)

**Evaluation Criteria (applies to each requirement):**

* **Functionality:** Does it work, even partially?

* **Innovation:** Are there unique features or clever solutions?

* **User Experience:** Is it easy to use? Does it have a clean UI?

* **Technical Quality:** Is the code well-structured and the architecture sound?

### **Final Pitch Presentation** (December 6th, 10:00-11:00 AM EST)

Only **eight finalist teams** will be invited to present and compete for final points.  
However, since the **podium will be announced on December 5th**, *all teams are required to prepare a 2.5-minute pitch presentation (with slides, to be collected before the call)*.  
Take this as an opportunity to learn how to prepare and deliver an effective pitch\!

**Pitch Evaluation Criteria:**

* **Presentation:** Clear, engaging, and on time?

* **Relevance:** Does the project provide real value or support to chapter leaders?


### **Evaluation Weights:**

* ### **Functional Requirements:** 

  * ### **Mandatory Features: 30%**

  * ### **Optional Features: 20%** 

* ### **Technical Requirements**

  * ### **Mandatory Features: 20%**

  * ### **Optional Features: 20%** 

* ### **Final Presentation: 10%**

### **Clarification:** optional features will also include the evaluation of *any additional features not listed in the requirements*. You may highlight these in your README under a dedicated section titled “Additional Features Developed.”

### **Judging Process**

To ensure fairness and technical relevance, the judging panel will include:

* A senior IEEE-HKN member with experience in chapter operations

* A professional or industry expert in software engineering

Each judge will assign points for every criterion  and the **total score** for each team will be calculated automatically, and **final rankings** will be determined based on the **average of all judges’ scores**.
