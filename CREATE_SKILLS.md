# Create Skills - Instructions

## Go to Browser Use Cloud and create 3 skills:

**URL:** https://cloud.browser-use.com/skills

---

## Skill 1: HackerNews Top Posts

**Prompt:**
```
Go to news.ycombinator.com and extract the top posts from the front page.
Return the title, points (score), and URL for each post.
The skill should accept a parameter "limit" (default 10) for how many posts to return.
```

**After creation, copy the skill UUID**

---

## Skill 2: Weather Forecast

**Prompt:**
```
Get the weather forecast for a given location.
The skill should accept parameters:
- "location" (required): city or location name
- "days" (default 3): number of days to forecast

Return the location name, date, weather condition, high temp, and low temp for each day.
```

**After creation, copy the skill UUID**

---

## Skill 3: News Search

**Prompt:**
```
Search for news articles on a given topic.
The skill should accept parameters:
- "query" (required): search term or topic
- "limit" (default 5): number of articles to return

Return article title, source/publisher, and published date for each article.
```

**After creation, copy the skill UUID**

---

## When done, paste the 3 UUIDs back to me in this format:

```
HackerNews: <uuid>
Weather: <uuid>
News: <uuid>
```

I'll add them to the code automatically.
