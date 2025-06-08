# QueuePlay Testing Documentation
 
**Purpose**: How we tested QueuePlay's authentication system (Beginner-friendly guide)

---

## 🤔 What is Testing & Why Do It?

**Testing** = Running your code with fake data to make sure it works before real users try it.

**Why test?** Because if your login system breaks, users can't use your app. Testing catches problems early.

---

## 🧪 How We Actually Tested Things

### **Step 1: Direct Code Testing (Backend)**
Think of this like testing a calculator - you give it numbers and check if the math is right.

```python
# We wrote Python scripts that directly called our functions:

# Test 1: Can we store data in Redis?
redis.set('test_key', 'test_value', ex=60)  # Store data for 60 seconds
result = redis.get('test_key')              # Get data back
print(f"Result: {result}")                  # Should print "test_value"

# Test 2: Can we create a user session?
session_id = auth_service.create_session('user123')
print(f"Session created: {session_id}")    # Should get a unique ID

# Test 3: Can we make a JWT token?
token = auth_service.generate_jwt_token(session_id)
print(f"JWT token: {token}")               # Should get encrypted token

# Test 4: Can we validate the token?
decoded = auth_service.validate_jwt_token(token)
print(f"User from token: {decoded['user_id']}")  # Should get "user123"
```

**Why this works:** We're testing each piece separately to make sure the building blocks work.

### **Step 2: HTTP Testing (Like a Browser)**
This is like pretending to be a user clicking buttons on a website.

```python
# We used Python to make HTTP requests (like clicking buttons):

# Step 1: Login (like filling out a login form)
response = requests.post('http://localhost:8000/auth/login', json={
    "user_id": "test123",
    "username": "TestUser"
})
print(f"Login status: {response.status_code}")  # Should be 200 (success)

# Step 2: Get the session cookie (browser does this automatically)
session_cookie = response.cookies.get('session_id')
print(f"Got session cookie: {session_cookie}")

# Step 3: Use session to get JWT token
token_response = requests.post('http://localhost:8000/auth/token', 
                              cookies={'session_id': session_cookie})
jwt_token = token_response.json()['access_token']
print(f"Got JWT token: {jwt_token}")

# Step 4: Use JWT token to access protected pages
headers = {'Authorization': f'Bearer {jwt_token}'}
protected_response = requests.get('http://localhost:8000/user/stats', headers=headers)
print(f"Protected page status: {protected_response.status_code}")  # Should be 200
```

**Why this works:** We're testing the full user journey from login to accessing protected content.

### **Step 3: Browser Console Testing (Real Browser)**
This is testing with an actual browser, like a real user.

```javascript
// Open browser, go to your site, press F12, paste this in Console:

// Step 1: Login
fetch('/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({user_id: 'test123', username: 'TestUser'})
}).then(response => {
  if (response.ok) {
    console.log('✅ Login successful!')
    return response.json()
  }
})

// Step 2: Get JWT token (browser handles cookies automatically)
fetch('/auth/token', {method: 'POST'})
  .then(response => response.json())
  .then(data => {
    console.log('✅ Got JWT token:', data.access_token)
    window.jwt_token = data.access_token  // Save for next step
  })

// Step 3: Access protected content
fetch('/user/stats', {
  headers: {'Authorization': `Bearer ${window.jwt_token}`}
}).then(response => response.json())
  .then(data => console.log('✅ Protected data:', data))
```

**Why this works:** We're testing exactly like a real user would interact with the website.

### **Step 4: FastAPI Interactive Documentation**
This is the easiest way to test APIs without writing any code.

**How to use it:**
1. Start your server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. Open browser and go to: `http://localhost:8000/docs`
3. You'll see a beautiful interactive API documentation page
4. Click on any endpoint to expand it
5. Click "Try it out" button
6. Fill in the parameters and click "Execute"

**Testing Authentication Flow:**
```
1. Test /auth/login endpoint:
   - Click "Try it out"
   - Enter: {"user_id": "test123", "username": "TestUser"}
   - Click "Execute"
   - Look for session cookie in browser dev tools

2. Test /auth/token endpoint:
   - The session cookie is automatically sent
   - Click "Execute" 
   - Copy the "access_token" from response

3. Test protected endpoints:
   - Click the "Authorize" button at the top of the page
   - Enter: Bearer YOUR_ACCESS_TOKEN_HERE
   - Now all protected endpoints will work
   - Try /user/stats or /createLobby
```

**Why this works:** FastAPI automatically generates interactive documentation that lets you test every endpoint with a user-friendly interface.

---

## 🔄 The Complete Authentication Testing Flow

### **What Happens When You Test Login:**

```
1. User enters username/password
   ↓
2. Server checks credentials (we skip this, just accept any user)
   ↓
3. Server creates a SESSION in Redis database
   ↓
4. Server sends back a COOKIE with session ID
   ↓
5. User's browser stores the cookie
   ↓
6. When user needs to do something, browser sends cookie
   ↓
7. Server looks up session, creates JWT token
   ↓
8. Server sends JWT token to user
   ↓
9. User includes JWT token in requests to protected pages
   ↓
10. Server validates JWT token and allows access
```

### **How We Tested Each Step:**

**Step 1-5: Login Flow**
```python
# We sent fake login data and checked if we got a session cookie back
response = requests.post('/auth/login', json={"user_id": "test123"})
assert response.status_code == 200
assert 'session_id' in response.cookies
```

**Step 6-8: Token Generation**
```python
# We used the session cookie to get a JWT token
cookies = {'session_id': session_cookie}
response = requests.post('/auth/token', cookies=cookies)
assert 'access_token' in response.json()
```

**Step 9-10: Protected Access**
```python
# We used the JWT token to access protected content
headers = {'Authorization': f'Bearer {jwt_token}'}
response = requests.get('/user/stats', headers=headers)
assert response.status_code == 200
```

---


### **Backend Testing & Quality Assurance**
- **Unit Testing**: Wrote Python scripts to test individual functions (auth, Redis, JWT)
- **Integration Testing**: Tested how different services work together (auth + database + tokens)
- **Security Testing**: Validated JWT token security, session management, and rate limiting
- **API Testing**: Tested complete login-to-access flow
- **Browser & Frontend Testing**: Used browser dev tools to test real user interactions
### **Test Automation & Tools**
- **Python Testing**: Used requests library for HTTP testing, asyncio for async testing
- **Browser DevTools**: Used F12 console for real-world user simulation
- **Command Line Testing**: Used curl for quick API endpoint verification
- **Documentation**: Created reusable test scripts and comprehensive test documentation

