from setuptools import setup, find_packages

setup(
    name="pharma-ml-service",
    version="0.1.0",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "pandas==2.1.4",
        "numpy==1.24.3",
        "python-dotenv==1.0.0",
        "psycopg2-binary==2.9.9",
        "sqlalchemy==2.0.23"
    ],
    python_requires=">=3.8",
)