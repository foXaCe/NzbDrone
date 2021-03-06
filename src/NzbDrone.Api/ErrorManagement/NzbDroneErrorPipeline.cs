﻿using System;
using System.Data.SQLite;
using FluentValidation;
using NLog;
using Nancy;
using NzbDrone.Api.Extensions;
using NzbDrone.Core.Exceptions;
using HttpStatusCode = Nancy.HttpStatusCode;

namespace NzbDrone.Api.ErrorManagement
{
    public class NzbDroneErrorPipeline
    {
        private readonly Logger _logger;

        public NzbDroneErrorPipeline(Logger logger)
        {
            _logger = logger;
        }

        public Response HandleException(NancyContext context, Exception exception)
        {

            var apiException = exception as ApiException;

            if (apiException != null)
            {
                _logger.WarnException("API Error", apiException);
                return apiException.ToErrorResponse();
            }

            var validationException = exception as ValidationException;

            if (validationException != null)
            {
                _logger.Warn("Invalid request {0}", validationException.Message);

                return validationException.Errors.AsResponse(HttpStatusCode.BadRequest);
            }

            var clientException = exception as NzbDroneClientException;

            if (clientException != null)
            {
                return new ErrorModel
                {
                    Message = exception.Message,
                    Description = exception.ToString()
                }.AsResponse((HttpStatusCode)clientException.StatusCode);
            }


            if (context.Request.Method == "PUT" || context.Request.Method == "POST")
            {
                var sqLiteException = exception as SQLiteException;

                if (sqLiteException != null)
                {
                    if (sqLiteException.Message.Contains("constraint failed"))
                        return new ErrorModel
                        {
                            Message = exception.Message,
                        }.AsResponse(HttpStatusCode.Conflict);
                }
            }

            _logger.FatalException("Request Failed", exception);

            return new ErrorModel
                {
                    Message = exception.Message,
                    Description = exception.ToString()
                }.AsResponse(HttpStatusCode.InternalServerError);
        }
    }
}