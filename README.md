# Erlang C Formula - Web Server Capacity Planner

🌐 **Live Demo**: [https://sherifabdlnaby.github.io/erlang-c-fleet-optimization-demo](https://sherifabdlnaby.github.io/erlang-c-fleet-optimization-demo)

A React application that visualizes the Erlang C formula applied to web server capacity planning. This tool helps you optimize the number of workers/threads needed to handle incoming requests while meeting your SLA requirements.

> ⚠️ **Disclaimer**: This project was entirely vibe coded, but human validated and tested. Don't look too much into the code - it's functional! See [DISCLAIMER.md](./DISCLAIMER.md) for details.

## What is Erlang C?

The Erlang C formula, developed by Danish mathematician A.K. Erlang in 1917, is a queueing theory model used to predict the probability that a call will be delayed (queued) in a call center system. It's particularly useful for capacity planning and resource allocation.

### Application to Web Servers

While originally designed for telephone systems, Erlang C applies perfectly to web servers:

- **Agents** → **Workers/Threads**: The number of concurrent request handlers
- **Calls** → **HTTP Requests**: Incoming requests to your server
- **Call Duration** → **Service Time**: Time to process a request
- **Wait Time** → **Queue Time**: Time requests wait before being processed

## Key Formulas

### Traffic Intensity (A)
```
A = λ × μ
```
Where:
- λ = arrival rate (requests per second)
- μ = average service time (seconds per request)

### Probability of Delay (Erlang C)
```
P(N,A) = (A^N / N!) / (A^N / N! + (1 - A/N) × Σ(A^k / k!))
```
Where:
- N = number of workers
- A = traffic intensity
- k = 0 to N-1

### Average Wait Time
```
W = P(N,A) × (μ / (N - A))
```

### Average Queue Length
```
L = (A × P(N,A)) / (N - A)
```

### Server Utilization
```
U = (A / N) × 100%
```

## Optimization Insights

1. **Traffic Intensity (A)**: Should be less than N (number of workers) for system stability
2. **Server Utilization**: A/N ratio - typically aim for 70-85% for good balance between cost and performance
3. **Wait Time**: Decreases exponentially as you add more workers
4. **Cost vs Performance**: More workers = lower wait times but higher infrastructure costs

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

### Deploying to GitHub Pages

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick deployment:
1. Update the `homepage` field in `package.json` with your GitHub username
2. Run `npm run deploy`
3. Enable GitHub Pages in your repository settings (use `gh-pages` branch)

## How to Use

1. **Set Request Arrival Rate**: Input your expected requests per second
2. **Set Average Service Time**: Input how long each request takes to process (in seconds)
3. **Adjust Number of Workers**: See how different worker counts affect metrics
4. **Set Target Max Wait Time**: Define your SLA requirement (default: 200ms)
5. **Click Optimize Workers**: Automatically find the minimum workers needed to meet your SLA
6. **Analyze Charts**: Understand trade-offs between cost and performance

## Features

- **Interactive Controls**: Adjust parameters in real-time
- **Multiple Visualizations**:
  - Wait Time vs Number of Workers
  - Probability of Queueing vs Number of Workers
  - Queue Length vs Number of Workers
  - Server Utilization vs Number of Workers
- **Request Flow Animation**: See requests flowing through a single server in real-time
- **Multi-Server Visualization**: Visualize load balancing across multiple servers
- **Server Optimization Tool**: Find optimal number of servers and workers using Erlang C
- **Real-time Metrics**: See current configuration metrics
- **Educational Content**: Learn about Erlang C formula and its applications

## Optimization Features

### Single Server Optimization
- Automatically calculates minimum workers needed to meet SLA
- Shows trade-offs between cost and performance
- Real-time visualization of request flow

### Multi-Server Optimization
The optimization tool uses Erlang C to find the best configuration by:

1. **Calculating Traffic Intensity per Server**
   - Divides total arrival rate by number of servers
   - Ensures each server can handle its share of traffic

2. **Finding Minimum Workers**
   - Uses Erlang C to determine minimum workers per server
   - Ensures wait time meets SLA requirements (A < N)

3. **Evaluating Configurations**
   - Tests all combinations of servers (1 to max) and workers per server
   - Calculates utilization, wait time, and cost for each
   - Scores configurations based on optimization goal

4. **Optimization Goals**
   - **Minimize Cost**: Fewest servers/workers while meeting SLA
   - **Maximize Performance**: Lowest wait times, highest utilization
   - **Balanced**: Good performance at reasonable cost
   - **Maximize Efficiency**: Highest utilization per dollar

### How to Optimize

1. Set your traffic parameters (arrival rate, service time, max wait time)
2. Configure cost parameters (cost per server, cost per worker)
3. Set search constraints (max servers, max workers per server)
4. Choose optimization goal
5. Review optimal configuration and top alternatives
6. Analyze cost vs performance trade-off chart

## References

### Academic Papers

1. **Erlang, A.K.** (1917). "Solution of some problems in the theory of probabilities of significance in automatic telephone exchanges". *Post Office Electrical Engineers' Journal*, 10, 189-197.

2. **Gross, D., & Harris, C.M.** (1998). *Fundamentals of Queueing Theory* (3rd ed.). Wiley-Interscience.

3. **Kleinrock, L.** (1975). *Queueing Systems, Volume 1: Theory*. Wiley-Interscience.

4. **Harchol-Balter, M.** (2013). *Performance Modeling and Design of Computer Systems: Queueing Theory in Action*. Cambridge University Press.

### Online Resources

- [Wikipedia: Erlang (unit)](https://en.wikipedia.org/wiki/Erlang_(unit))
- [Call Centre Helper: Erlang C Explained](https://www.callcentrehelper.com/erlang-c-formula-explained-121281.htm)
- [Erlang Calculator](https://www.erlang.com/calculator/erlangc/)

## Technology Stack

- **React** - UI framework
- **Recharts** - Charting library
- **CSS3** - Styling

## Embedding in Articles

You can embed this app in articles, blog posts, or websites using an iframe. See [EMBED.md](./EMBED.md) for complete embedding documentation and examples.

### Quick Embed Example

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/erlang-c" 
  width="100%" 
  height="900px" 
  frameborder="0"
  title="Erlang C Web Server Capacity Planner">
</iframe>
```

## Disclaimer

⚠️ **Important**: This project was entirely vibe coded, but human validated and tested. The Erlang C formulas are mathematically correct and the app functions properly, but don't look too much into the code quality. See [DISCLAIMER.md](./DISCLAIMER.md) for full details.

## License

This project is open source and available for educational purposes.

## Contributing

Contributions, issues, and feature requests are welcome! But please note: code quality improvements are welcome, but functionality and mathematical accuracy are the priorities.
