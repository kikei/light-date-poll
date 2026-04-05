# AWS Lambda deployment

Run the application as a container on AWS Lambda using the Lambda Web
Adapter. The PostgreSQL database is provisioned separately and
specified via the `DATABASE_URL` environment variable (e.g. Neon).

## Prerequisites

- An AWS account
- A PostgreSQL database with its connection string (e.g. Neon)
- A GitHub repository

## One-time setup

### 1. Create the ECR repository

```bash
aws ecr create-repository --repository-name light-date-poll
```

### 2. Create the Lambda execution role

```bash
cat <<'EOF' > /tmp/trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name light-date-poll-lambda \
  --assume-role-policy-document file:///tmp/trust-policy.json

aws iam attach-role-policy \
  --role-name light-date-poll-lambda \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 3. Create the deployment IAM user

```bash
aws iam create-user --user-name light-date-poll-deploy

aws iam attach-user-policy \
  --user-name light-date-poll-deploy \
  --policy-arn \
    arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

cat <<'EOF' > /tmp/lambda-deploy-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunction",
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:CreateFunctionUrlConfig",
        "lambda:GetFunctionUrlConfig",
        "lambda:AddPermission"
      ],
      "Resource":
        "arn:aws:lambda:*:*:function:light-date-poll"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource":
        "arn:aws:iam::*:role/light-date-poll-lambda"
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name light-date-poll-deploy \
  --policy-name light-date-poll-deploy \
  --policy-document file:///tmp/lambda-deploy-policy.json

aws iam create-access-key --user-name light-date-poll-deploy
```

Save the `AccessKeyId` and `SecretAccessKey` from the last command.
The secret access key cannot be retrieved later.

### 4. Configure GitHub Secrets

Add the following as Repository secrets under Settings → Secrets
and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Access key ID from step 3 |
| `AWS_SECRET_ACCESS_KEY` | Secret access key from step 3 |
| `DATABASE_URL` | PostgreSQL connection string |

## Deployment

Push to `main` to trigger `.github/workflows/deploy.yml`. On the
first run, the Function URL is printed in the workflow log.
