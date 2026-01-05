# Embedding the Erlang C Visualizer

You can embed the Erlang C Visualizer in your articles, blog posts, or websites using an iframe.

## Basic Embed Code

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/erlang-c" 
  width="100%" 
  height="800px" 
  frameborder="0" 
  scrolling="no"
  title="Erlang C Web Server Capacity Planner">
</iframe>
```

## Responsive Embed (Recommended)

For responsive embedding that adapts to different screen sizes: Hello 

```html
<div style="position: relative; padding-bottom: 75%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe 
    src="https://YOUR_USERNAME.github.io/erlang-c" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    frameborder="0" 
    scrolling="no"
    title="Erlang C Web Server Capacity Planner"
    allowfullscreen>
  </iframe>
</div>
```

## Pre-configured Embeds

You can pre-configure the app using URL parameters:

### Individual Server Tab with Pre-set Values

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/erlang-c?tab=individual&arrivalRate=150&serviceTime=50&workers=8&maxWait=200" 
  width="100%" 
  height="800px" 
  frameborder="0"
  title="Erlang C - Individual Server Optimization">
</iframe>
```

### Fleet Optimization Tab

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/erlang-c?tab=fleet&arrivalRate=200&servers=5&workers=6&utilization=75" 
  width="100%" 
  height="900px" 
  frameborder="0"
  title="Erlang C - Fleet Optimization">
</iframe>
```

## Available URL Parameters

### Tab Selection
- `tab=individual` - Individual Server Optimization tab
- `tab=fleet` - Fleet Optimization tab

### Traffic Parameters
- `arrivalRate` - Total Arrival Rate (requests per second)
- `serviceTime` - Average Service Time (milliseconds)

### Server Configuration
- `servers` - Number of Servers
- `workers` - Workers per Server
- `utilization` - Target Utilization (%)
- `autoUtil` - Auto-adjust servers (true/false)

### SLA Metrics
- `maxWait` - Max Wait Time (milliseconds)
- `maxProb` - Max Probability of Queueing (%)

### Cost Parameters
- `costWorker` - Cost per Worker ($)
- `overhead` - Per Server Overhead ($)

## Example Use Cases

### 1. Article with Pre-configured Example

```html
<article>
  <h2>Optimizing Server Capacity</h2>
  <p>Here's an example configuration for handling 150 requests per second:</p>
  
  <div style="margin: 2rem 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <iframe 
      src="https://YOUR_USERNAME.github.io/erlang-c?tab=individual&arrivalRate=150&serviceTime=50&workers=8" 
      width="100%" 
      height="700px" 
      frameborder="0"
      title="Erlang C Example Configuration">
    </iframe>
  </div>
</article>
```

### 2. Side-by-side Comparison

```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
  <div>
    <h3>Low Traffic Scenario</h3>
    <iframe 
      src="https://YOUR_USERNAME.github.io/erlang-c?tab=fleet&arrivalRate=50&servers=2&workers=4" 
      width="100%" 
      height="600px" 
      frameborder="0">
    </iframe>
  </div>
  <div>
    <h3>High Traffic Scenario</h3>
    <iframe 
      src="https://YOUR_USERNAME.github.io/erlang-c?tab=fleet&arrivalRate=500&servers=10&workers=8" 
      width="100%" 
      height="600px" 
      frameborder="0">
    </iframe>
  </div>
</div>
```

### 3. Responsive Embed in Blog Post

```html
<div class="embed-container" style="position: relative; padding-bottom: 75%; height: 0; overflow: hidden; max-width: 100%; margin: 2rem 0;">
  <iframe 
    src="https://YOUR_USERNAME.github.io/erlang-c" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    frameborder="0"
    scrolling="no"
    title="Erlang C Web Server Capacity Planner"
    allowfullscreen>
  </iframe>
</div>
```

## Height Recommendations

- **Minimum**: 600px (for basic functionality)
- **Recommended**: 800-900px (for comfortable viewing)
- **Full Experience**: 1000px+ (for all features visible)

## Styling Tips

### Add Border/Shadow

```html
<div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <iframe src="..." style="display: block;"></iframe>
</div>
```

### Center Align

```html
<div style="text-align: center; margin: 2rem 0;">
  <iframe src="..." style="max-width: 1200px; width: 100%;"></iframe>
</div>
```

## Security Considerations

GitHub Pages allows iframe embedding by default (no X-Frame-Options restrictions). The app is ready to be embedded in any website.

**Note**: If you deploy to a platform that blocks iframe embedding by default (some CDNs or hosting services), you may need to configure headers to allow embedding. The app itself doesn't set any restrictions.

## Troubleshooting

### Iframe Not Loading
- Check that the URL is correct and accessible
- Verify GitHub Pages is enabled and deployed
- Check browser console for CORS or security errors

### Content Not Responsive
- Ensure parent container has proper width constraints
- Use the responsive embed code provided above
- Check that viewport meta tag is present (already included)

### URL Parameters Not Working
- Verify parameter names match exactly (case-sensitive)
- Check that values are valid numbers
- Ensure no extra spaces in the URL

## WordPress/Medium/Other Platforms

Most platforms support iframe embedding:

**WordPress**: Use HTML block and paste the iframe code

**Medium**: Use the embed feature or HTML block

**Markdown**: Some platforms support HTML directly, others may require HTML blocks

**Notion**: Use `/embed` command and paste the URL

## Support

For issues or questions about embedding, please open an issue on the GitHub repository.
