import pandas as pd
import statsmodels.api as sm
import matplotlib.pyplot as plt
import sys

# sys.argv[1] path
# sys.argv[2] Independent variable
# sys.argv[3] Dependent variable

# Load the data from a local CSV file
file_path = sys.argv[1]  # Replace with the path to your CSV file
housing_data = pd.read_csv(file_path, delimiter=',')

# Prepare the independent and dependent variables
X = housing_data[sys.argv[2]]  # Independent variable
y = housing_data[sys.argv[3]]  # Dependent variable

# Add a constant to the model (intercept)
X_with_constant = sm.add_constant(X)

# Perform the linear regression
model = sm.OLS(y, X_with_constant).fit()

# Plotting
plt.figure(figsize=(10, 6))
plt.scatter(X, y, alpha=0.5)  # Scatter plot of the data
plt.plot(X, model.predict(X_with_constant), color='red')  # Regression line
plt.title('Median Income vs. Median House Value')
plt.xlabel('Median Income')
plt.ylabel('Median House Value')
#plt.show()
plt.savefig('ols.png')

print(model.summary())
