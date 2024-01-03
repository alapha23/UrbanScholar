from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import statsmodels.api as sm
import pandas as pd
import sys

# sys.argv[1] path
# sys.argv[2] Independent variable, e.g., median_income,housing_median_age
# sys.argv[3] Dependent variable

# Load the data from a local CSV file
file_path = sys.argv[1]  # Replace with the path to your CSV file
housing_data = pd.read_csv(file_path, delimiter=',')

# Prepare the independent and dependent variables
independent_vars = sys.argv[2].split(',')
X = housing_data[independent_vars]  # Independent variable
y = housing_data[sys.argv[3]]  # Dependent variable

# Adding a constant to the independent variable set for statsmodels
X_sm = sm.add_constant(X)

# Fitting the model using statsmodels
model = sm.OLS(y, X_sm).fit()

# Displaying the summary
model_summary = model.summary()
print(model_summary)
